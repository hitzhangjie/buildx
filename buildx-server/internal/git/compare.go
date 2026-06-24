package git

import (
	"bytes"
	"os/exec"
	"sort"
	"strings"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	fdiff "github.com/go-git/go-git/v5/plumbing/format/diff"
)

// Whitespace options mirror OneDev WhitespaceOption enum names.
const (
	WhitespaceIgnoreTrailing = "IGNORE_TRAILING"
	WhitespaceIgnoreLeading  = "IGNORE_LEADING"
	WhitespaceIgnoreChange   = "IGNORE_CHANGE"
	WhitespaceIgnoreAll      = "IGNORE_ALL"
	WhitespaceDoNotIgnore    = "DO_NOT_IGNORE"
)

func normalizeWhitespaceOption(option string) string {
	option = strings.TrimSpace(strings.ToUpper(option))
	if option == "" {
		return WhitespaceIgnoreTrailing
	}
	switch option {
	case WhitespaceIgnoreTrailing, WhitespaceIgnoreLeading, WhitespaceIgnoreChange, WhitespaceIgnoreAll, WhitespaceDoNotIgnore:
		return option
	default:
		return WhitespaceIgnoreTrailing
	}
}

func gitDiffWhitespaceArgs(option string) []string {
	switch normalizeWhitespaceOption(option) {
	case WhitespaceIgnoreChange:
		return []string{"-b"}
	case WhitespaceIgnoreAll:
		return []string{"-w"}
	case WhitespaceIgnoreTrailing:
		return []string{"--ignore-space-at-eol"}
	default:
		return nil
	}
}

// RevisionDetail is a resolved revision with commit metadata.
type RevisionDetail struct {
	Revision   string `json:"revision"`
	CommitHash string `json:"commitHash"`
	Subject    string `json:"subject,omitempty"`
}

// ResolveRevisionDetail resolves a revision name to its commit hash and subject.
func (r *Repository) ResolveRevisionDetail(revision string) (*RevisionDetail, error) {
	if !r.HasRefs() {
		return nil, nil
	}
	hash, err := r.ResolveCommitHash(revision)
	if err != nil {
		return nil, err
	}
	commit, err := r.GetCommit(hash)
	if err != nil {
		return nil, err
	}
	if commit == nil {
		return nil, nil
	}
	return &RevisionDetail{
		Revision:   revision,
		CommitHash: commit.Hash,
		Subject:    commit.Subject,
	}, nil
}

// MergeBase returns the best common ancestor of two revisions, or empty string when
// histories are unrelated.
func (r *Repository) MergeBase(revision1, revision2 string) (string, error) {
	if !r.HasRefs() {
		return "", nil
	}
	hash1, err := r.ResolveCommitHash(revision1)
	if err != nil {
		return "", err
	}
	hash2, err := r.ResolveCommitHash(revision2)
	if err != nil {
		return "", err
	}
	if hash1 == hash2 {
		return hash1, nil
	}

	cmd := exec.Command("git", "-C", r.path, "merge-base", hash1, hash2)
	out, err := cmd.Output()
	if err != nil {
		if exit, ok := err.(*exec.ExitError); ok && exit.ExitCode() == 1 {
			return "", nil
		}
		return "", err
	}
	base := strings.TrimSpace(string(out))
	if base == "" {
		return "", nil
	}
	return base, nil
}

// DiffRevisions returns per-file unified diffs between two revisions.
func (r *Repository) DiffRevisions(oldRevision, newRevision, whitespaceOption string) ([]FileDiff, error) {
	if !r.HasRefs() {
		return []FileDiff{}, nil
	}
	whitespaceOption = normalizeWhitespaceOption(whitespaceOption)
	if whitespaceOption != WhitespaceIgnoreTrailing && whitespaceOption != WhitespaceDoNotIgnore {
		return r.diffRevisionsGit(oldRevision, newRevision, whitespaceOption)
	}
	return r.diffRevisionsGoGit(oldRevision, newRevision)
}

func (r *Repository) diffRevisionsGoGit(oldRevision, newRevision string) ([]FileDiff, error) {
	oldHash, err := r.ResolveCommitHash(oldRevision)
	if err != nil {
		return nil, err
	}
	newHash, err := r.ResolveCommitHash(newRevision)
	if err != nil {
		return nil, err
	}

	oldCommit, err := r.inner.CommitObject(plumbing.NewHash(oldHash))
	if err != nil {
		return nil, err
	}
	newCommit, err := r.inner.CommitObject(plumbing.NewHash(newHash))
	if err != nil {
		return nil, err
	}

	oldTree, err := oldCommit.Tree()
	if err != nil {
		return nil, err
	}
	newTree, err := newCommit.Tree()
	if err != nil {
		return nil, err
	}

	patch, err := oldTree.Patch(newTree)
	if err != nil {
		return nil, err
	}
	return filePatchesToDiffs(patch.FilePatches())
}

// ExportPatch returns a unified patch between two revisions.
func (r *Repository) ExportPatch(oldRevision, newRevision, whitespaceOption string) ([]byte, error) {
	if !r.HasRefs() {
		return nil, nil
	}
	oldHash, err := r.ResolveCommitHash(oldRevision)
	if err != nil {
		return nil, err
	}
	newHash, err := r.ResolveCommitHash(newRevision)
	if err != nil {
		return nil, err
	}
	args := []string{"-C", r.path, "diff"}
	args = append(args, gitDiffWhitespaceArgs(whitespaceOption)...)
	args = append(args, oldHash, newHash)
	return exec.Command("git", args...).Output()
}

func (r *Repository) diffRevisionsGit(oldRevision, newRevision, whitespaceOption string) ([]FileDiff, error) {
	patch, err := r.ExportPatch(oldRevision, newRevision, whitespaceOption)
	if err != nil {
		return nil, err
	}
	return parseUnifiedDiff(string(patch)), nil
}

func parseUnifiedDiff(patch string) []FileDiff {
	patch = strings.TrimSpace(patch)
	if patch == "" {
		return []FileDiff{}
	}

	var parts []string
	lines := strings.Split(patch, "\n")
	start := 0
	for i, line := range lines {
		if strings.HasPrefix(line, "diff --git ") {
			if i > start {
				parts = append(parts, strings.Join(lines[start:i], "\n"))
			}
			start = i
		}
	}
	if start < len(lines) {
		parts = append(parts, strings.Join(lines[start:], "\n"))
	}

	diffs := make([]FileDiff, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		path := extractDiffPath(part)
		if path == "" {
			continue
		}
		adds, dels := countUnifiedDiffLines(part)
		diffs = append(diffs, FileDiff{
			Path:      path,
			Additions: adds,
			Deletions: dels,
			Diff:      part + "\n",
		})
	}
	sort.Slice(diffs, func(i, j int) bool {
		return diffs[i].Path < diffs[j].Path
	})
	return diffs
}

func extractDiffPath(part string) string {
	for _, line := range strings.Split(part, "\n") {
		if strings.HasPrefix(line, "+++ ") {
			path := strings.TrimPrefix(line, "+++ ")
			if path == "/dev/null" {
				continue
			}
			path = strings.TrimPrefix(path, "b/")
			return path
		}
	}
	for _, line := range strings.Split(part, "\n") {
		if strings.HasPrefix(line, "diff --git ") {
			fields := strings.Fields(line)
			if len(fields) >= 4 {
				path := strings.TrimPrefix(fields[3], "b/")
				return path
			}
		}
	}
	return ""
}

func countUnifiedDiffLines(part string) (adds, dels int) {
	for _, line := range strings.Split(part, "\n") {
		if len(line) == 0 {
			continue
		}
		switch {
		case strings.HasPrefix(line, "+++"), strings.HasPrefix(line, "---"), strings.HasPrefix(line, "diff --git"), strings.HasPrefix(line, "index "), strings.HasPrefix(line, "@@"), strings.HasPrefix(line, "\\ No newline"):
			continue
		case line[0] == '+':
			adds++
		case line[0] == '-':
			dels++
		}
	}
	return adds, dels
}

// ListCommitsSince walks from head back toward (but excluding) base, up to count commits.
func (r *Repository) ListCommitsSince(baseRevision, headRevision string, count int) ([]Commit, error) {
	if !r.HasRefs() {
		return []Commit{}, nil
	}
	if count <= 0 {
		count = 100
	}

	baseHash, err := r.ResolveCommitHash(baseRevision)
	if err != nil {
		return nil, err
	}
	headHash, err := r.ResolveCommitHash(headRevision)
	if err != nil {
		return nil, err
	}
	if baseHash == headHash {
		return []Commit{}, nil
	}

	iter, err := r.inner.Log(&gogit.LogOptions{From: plumbing.NewHash(headHash)})
	if err != nil {
		return nil, err
	}
	defer iter.Close()

	commits := make([]Commit, 0, count)
	for len(commits) < count {
		obj, err := iter.Next()
		if err != nil {
			break
		}
		if obj.Hash.String() == baseHash {
			break
		}
		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}

// FilterDiffsByPath keeps diffs whose path matches any whitespace-separated glob pattern.
func FilterDiffsByPath(diffs []FileDiff, pathFilter string) []FileDiff {
	pathFilter = strings.TrimSpace(pathFilter)
	if pathFilter == "" {
		return diffs
	}
	patterns := strings.Fields(pathFilter)
	filtered := make([]FileDiff, 0, len(diffs))
	for _, d := range diffs {
		if matchesPathFilter(d.Path, patterns) {
			filtered = append(filtered, d)
		}
	}
	if filtered == nil {
		filtered = []FileDiff{}
	}
	return filtered
}

func matchesPathFilter(path string, patterns []string) bool {
	for _, p := range patterns {
		ok, _ := pathMatch(p, path, false)
		if ok {
			return true
		}
		if strings.Contains(path, p) {
			return true
		}
	}
	return false
}

func filePatchesToDiffs(filePatches []fdiff.FilePatch) ([]FileDiff, error) {
	diffs := make([]FileDiff, 0, len(filePatches))
	for _, fp := range filePatches {
		if fp.IsBinary() {
			continue
		}
		from, to := fp.Files()
		path := ""
		if to != nil {
			path = to.Path()
		}
		if from != nil {
			path = from.Path()
		}

		adds, dels := countChunkLines(fp)
		var buf bytes.Buffer
		enc := fdiff.NewUnifiedEncoder(&buf, fdiff.DefaultContextLines)
		if err := enc.Encode(singleFilePatch{fp}); err != nil {
			continue
		}

		diffs = append(diffs, FileDiff{
			Path:      path,
			Additions: adds,
			Deletions: dels,
			Diff:      buf.String(),
		})
	}
	if diffs == nil {
		diffs = []FileDiff{}
	}
	return diffs, nil
}

func countChunkLines(fp fdiff.FilePatch) (adds, dels int) {
	for _, chunk := range fp.Chunks() {
		s := chunk.Content()
		switch chunk.Type() {
		case fdiff.Add:
			adds += strings.Count(s, "\n")
			if len(s) > 0 && s[len(s)-1] != '\n' {
				adds++
			}
		case fdiff.Delete:
			dels += strings.Count(s, "\n")
			if len(s) > 0 && s[len(s)-1] != '\n' {
				dels++
			}
		}
	}
	return adds, dels
}

// IsAncestor reports whether ancestor is an ancestor of descendant.
func (r *Repository) IsAncestor(ancestorRevision, descendantRevision string) (bool, error) {
	ancestor, err := r.ResolveCommitHash(ancestorRevision)
	if err != nil {
		return false, err
	}
	descendant, err := r.ResolveCommitHash(descendantRevision)
	if err != nil {
		return false, err
	}
	if ancestor == descendant {
		return true, nil
	}

	cmd := exec.Command("git", "-C", r.path, "merge-base", "--is-ancestor", ancestor, descendant)
	err = cmd.Run()
	if err == nil {
		return true, nil
	}
	if exit, ok := err.(*exec.ExitError); ok && exit.ExitCode() == 1 {
		return false, nil
	}
	return false, err
}
