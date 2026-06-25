package git

import (
	"path/filepath"
	"sort"
	"strings"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// ---------------------------------------------------------------------------
// Commit info statistics — matches OneDev's CommitInfoService
// ---------------------------------------------------------------------------

// Contribution holds aggregate contribution counts for a single day.
// Matches OneDev's GitContribution.
type Contribution struct {
	Commits   int `json:"commits"`
	Additions int `json:"additions"`
	Deletions int `json:"deletions"`
}

// Contributor holds contribution data for a single author.
// Matches OneDev's GitContributor.
type Contributor struct {
	AuthorName         string         `json:"authorName"`
	AuthorEmail        string         `json:"authorEmailAddress"`
	TotalCommits       int            `json:"totalCommits"`
	TotalAdditions     int            `json:"totalAdditions"`
	TotalDeletions     int            `json:"totalDeletions"`
	DailyContributions map[int]int    `json:"dailyContributions"`
	AuthorAvatarURL    string         `json:"authorAvatarUrl"`
	CommitsURL         string         `json:"commitsUrl"`
	AuthorProfileURL   string         `json:"authorProfileUrl,omitempty"`
}

// GetOverallContributions iterates all commits on the given revision (default
// branch), excluding merge commits, and returns per-day aggregate counts of
// commits, additions, and deletions.
//
// The returned map uses epoch-day integers as keys (matching OneDev's
// representation). Epoch day = commit timestamp Unix / 86400.
func (r *Repository) GetOverallContributions(revision string) (map[int]*Contribution, error) {
	if revision == "" {
		revision = r.DefaultRevision()
	}
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil, err
	}

	iter, err := r.inner.Log(&gogit.LogOptions{From: *hash, Order: gogit.LogOrderCommitterTime})
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	result := make(map[int]*Contribution)
	for {
		obj, err := iter.Next()
		if err != nil {
			break
		}
		// Skip merge commits (more than one parent).
		if obj.NumParents() > 1 {
			continue
		}

		day := epochDay(obj.Committer.When)

		// Compute additions / deletions for this commit.
		parent, _ := obj.Parent(0) // nil for root commits
		patch, err := obj.Patch(parent)
		if err != nil {
			continue
		}
		adds, dels := patchStats(patch)

		c := result[day]
		if c == nil {
			c = &Contribution{}
			result[day] = c
		}
		c.Commits++
		c.Additions += adds
		c.Deletions += dels
	}
	return result, nil
}

// GetLineIncrements iterates commits chronologically (oldest first) on the
// given revision and computes net line changes per programming language per
// day. The returned map uses epoch-day keys; each inner map is language → net
// cumulative line count for that day.
//
// Languages are detected by file extension. Only the top languages are
// typically charted on the frontend.
func (r *Repository) GetLineIncrements(revision string) (map[int]map[string]int, error) {
	if revision == "" {
		revision = r.DefaultRevision()
	}
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil, err
	}

	// Collect all commits in chronological order.
	type commitDay struct {
		day int
		obj *object.Commit
	}
	var commits []commitDay
	iter, err := r.inner.Log(&gogit.LogOptions{From: *hash, Order: gogit.LogOrderCommitterTime})
	if err != nil {
		return nil, err
	}
	defer iter.Close()
	for {
		obj, err := iter.Next()
		if err != nil {
			break
		}
		if obj.NumParents() > 1 {
			continue
		}
		commits = append(commits, commitDay{day: epochDay(obj.Committer.When), obj: obj})
	}
	// Reverse to chronological order (oldest first).
	for i, j := 0, len(commits)-1; i < j; i, j = i+1, j-1 {
		commits[i], commits[j] = commits[j], commits[i]
	}

	// Compute cumulative net lines per language per day.
	result := make(map[int]map[string]int)
	cumulative := make(map[string]int)

	for _, cd := range commits {
		parent, _ := cd.obj.Parent(0)
		patch, err := cd.obj.Patch(parent)
		if err != nil {
			continue
		}
		langDeltas := patchLanguageDeltas(patch)
		for lang, delta := range langDeltas {
			cumulative[lang] += delta
		}

		// Deep-copy cumulative state for this day.
		dayMap := make(map[string]int, len(cumulative))
		for lang, v := range cumulative {
			dayMap[lang] = v
		}
		result[cd.day] = dayMap
	}
	return result, nil
}

// GetTopContributors returns the top N contributors sorted by the given
// contribution type within the given date range. fromDay and toDay are
// inclusive epoch-day values.
func (r *Repository) GetTopContributors(revision string, top int, contribType string, fromDay, toDay int) ([]*Contributor, error) {
	if revision == "" {
		revision = r.DefaultRevision()
	}
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil, err
	}

	iter, err := r.inner.Log(&gogit.LogOptions{From: *hash, Order: gogit.LogOrderCommitterTime})
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	// Map keyed by author email (lowercased) for grouping.
	type authorData struct {
		name  string
		email string
	}
	contribsByAuthor := make(map[string]*Contributor)

	for {
		obj, err := iter.Next()
		if err != nil {
			break
		}
		if obj.NumParents() > 1 {
			continue
		}
		day := epochDay(obj.Committer.When)
		if day < fromDay || day > toDay {
			continue
		}

		email := strings.ToLower(obj.Author.Email)
		name := obj.Author.Name
		c := contribsByAuthor[email]
		if c == nil {
			c = &Contributor{
				AuthorName:         name,
				AuthorEmail:        obj.Author.Email,
				DailyContributions: make(map[int]int),
			}
			contribsByAuthor[email] = c
		}

		parent, _ := obj.Parent(0)
		patch, err := obj.Patch(parent)
		if err != nil {
			continue
		}
		adds, dels := patchStats(patch)

		var dailyVal int
		switch contribType {
		case "ADDITIONS":
			dailyVal = adds
		case "DELETIONS":
			dailyVal = dels
		default: // COMMITS
			dailyVal = 1
		}

		c.TotalCommits++
		c.TotalAdditions += adds
		c.TotalDeletions += dels
		c.DailyContributions[day] += dailyVal
	}

	// Convert to slice and sort.
	contributors := make([]*Contributor, 0, len(contribsByAuthor))
	for _, c := range contribsByAuthor {
		contributors = append(contributors, c)
	}

	sort.Slice(contributors, func(i, j int) bool {
		switch contribType {
		case "ADDITIONS":
			return contributors[i].TotalAdditions > contributors[j].TotalAdditions
		case "DELETIONS":
			return contributors[i].TotalDeletions > contributors[j].TotalDeletions
		default: // COMMITS
			return contributors[i].TotalCommits > contributors[j].TotalCommits
		}
	})

	if top > 0 && len(contributors) > top {
		contributors = contributors[:top]
	}
	return contributors, nil
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// epochDay returns the epoch day for a time.Time, matching OneDev's
// LocalDate.ofEpochDay convention (UTC days since Unix epoch).
func epochDay(t interface{ Unix() int64 }) int {
	return int(t.Unix() / 86400)
}

// patchStats returns total additions and deletions across all file patches.
func patchStats(patch *object.Patch) (adds, dels int) {
	for _, fp := range patch.FilePatches() {
		if fp.IsBinary() {
			continue
		}
		for _, chunk := range fp.Chunks() {
			content := chunk.Content()
			if chunk.Type() == 1 { // Add
				adds += strings.Count(content, "\n")
			} else if chunk.Type() == 2 { // Delete
				dels += strings.Count(content, "\n")
			}
		}
	}
	return
}

// patchLanguageDeltas computes net line additions per language from a patch.
// Language is determined from file extension.
func patchLanguageDeltas(patch *object.Patch) map[string]int {
	result := make(map[string]int)
	for _, fp := range patch.FilePatches() {
		if fp.IsBinary() {
			continue
		}
		from, to := fp.Files()
		path := ""
		if to != nil {
			path = to.Path()
		} else if from != nil {
			path = from.Path()
		}
		lang := detectLanguage(filepath.Ext(path))

		adds, dels := 0, 0
		for _, chunk := range fp.Chunks() {
			content := chunk.Content()
			if chunk.Type() == 1 { // Add
				adds += strings.Count(content, "\n")
			} else if chunk.Type() == 2 { // Delete
				dels += strings.Count(content, "\n")
			}
		}
		result[lang] += adds - dels
	}
	return result
}

// detectLanguage maps a file extension to a display language name.
func detectLanguage(ext string) string {
	switch strings.ToLower(ext) {
	case ".go":
		return "Go"
	case ".ts", ".tsx":
		return "TypeScript"
	case ".js", ".jsx", ".mjs", ".cjs":
		return "JavaScript"
	case ".java", ".kt", ".kts":
		return "Java/Kotlin"
	case ".py", ".pyx", ".pyi":
		return "Python"
	case ".css", ".scss", ".sass", ".less":
		return "CSS"
	case ".html", ".htm", ".xhtml", ".shtml":
		return "HTML"
	case ".md", ".mdx", ".markdown":
		return "Markdown"
	case ".json", ".yaml", ".yml", ".toml", ".ini", ".cfg":
		return "Configuration"
	case ".xml", ".svg":
		return "XML/SVG"
	case ".sql":
		return "SQL"
	case ".sh", ".bash", ".zsh", ".fish":
		return "Shell"
	case ".c", ".h":
		return "C"
	case ".cpp", ".cc", ".cxx", ".hpp", ".hxx":
		return "C++"
	case ".rs":
		return "Rust"
	case ".rb":
		return "Ruby"
	case ".php":
		return "PHP"
	case ".swift":
		return "Swift"
	case ".r", ".R", ".Rmd":
		return "R"
	case ".proto":
		return "Protobuf"
	case ".vue":
		return "Vue"
	case ".svelte":
		return "Svelte"
	case ".tf", ".tfvars":
		return "Terraform"
	case ".dockerfile", ".dockerignore":
		return "Docker"
	case ".makefile", ".mk":
		return "Makefile"
	case ".graphql", ".gql":
		return "GraphQL"
	case ".cmake", "CMakeLists.txt":
		return "CMake"
	case ".zig":
		return "Zig"
	default:
		return "Other"
	}
}
