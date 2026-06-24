package git

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"log/slog"
	"regexp"
	"sort"
	"strings"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/filemode"
	fdiff "github.com/go-git/go-git/v5/plumbing/format/diff"
	"github.com/go-git/go-git/v5/plumbing/object"
)

// ---------------------------------------------------------------------------
// Ref introspection
// ---------------------------------------------------------------------------

// HasRefs returns true when the repository has at least one branch pointing at
// a commit. A freshly initialized bare repo only has a symbolic HEAD and must
// return false so the UI shows the empty-project guidance.
func (r *Repository) HasRefs() bool {
	refs, err := r.inner.References()
	if err != nil {
		slog.Error("go-git References failed", "error", err)
		return false
	}
	defer refs.Close()
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsBranch() {
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err == nil {
			return true
		}
	}
	return false
}

// DefaultRevision returns the default branch name, preferring HEAD when it
// resolves, then main/master, then any branch with commits.
func (r *Repository) DefaultRevision() string {
	head, err := r.inner.Head()
	if err == nil {
		ref := head.Name()
		if ref.IsBranch() {
			short := ref.Short()
			if r.revisionExists(short) {
				return short
			}
		}
	}
	for _, name := range []string{"main", "master"} {
		if r.revisionExists(name) {
			return name
		}
	}
	if branch := r.firstBranchWithCommits(); branch != "" {
		return branch
	}
	return "main"
}

func (r *Repository) firstBranchWithCommits() string {
	refs, err := r.inner.References()
	if err != nil {
		return ""
	}
	defer refs.Close()
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsBranch() {
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err == nil {
			return ref.Name().Short()
		}
	}
	return ""
}

func (r *Repository) revisionExists(revision string) bool {
	_, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	return err == nil
}

// ResolveCommitHash resolves a revision to its commit hash.
func (r *Repository) ResolveCommitHash(revision string) (string, error) {
	if revision == "" {
		revision = r.DefaultRevision()
	}
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return "", err
	}
	return hash.String(), nil
}

// BranchDetail is the REST shape for a single branch ref.
type BranchDetail struct {
	RefName    string `json:"refName"`
	CommitHash string `json:"commitHash"`
	Updated    string `json:"updated,omitempty"`
}

// TagDetail is the REST shape for a single tag ref.
type TagDetail struct {
	RefName    string `json:"refName"`
	CommitHash string `json:"commitHash"`
	Updated    string `json:"updated,omitempty"`
	Message    string `json:"message,omitempty"`
}

// ListBranchNames returns sorted branch names that point at commits.
func (r *Repository) ListBranchNames() ([]string, error) {
	refs, err := r.inner.References()
	if err != nil {
		return nil, err
	}
	defer refs.Close()

	var names []string
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsBranch() {
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err != nil {
			continue
		}
		names = append(names, ref.Name().Short())
	}
	sort.Strings(names)
	return names, nil
}

// BranchDetail looks up a branch by short name.
func (r *Repository) BranchDetail(branchName string) (*BranchDetail, error) {
	ref, err := r.inner.Reference(plumbing.NewBranchReferenceName(branchName), true)
	if err != nil {
		return nil, err
	}
	commit, err := r.inner.CommitObject(ref.Hash())
	if err != nil {
		return nil, err
	}
	return &BranchDetail{
		RefName:    ref.Name().String(),
		CommitHash: commit.Hash.String(),
		Updated:    humanizeTime(commit.Committer.When),
	}, nil
}

// ListTagNames returns sorted tag names that point at commits.
func (r *Repository) ListTagNames() ([]string, error) {
	refs, err := r.inner.References()
	if err != nil {
		return nil, err
	}
	defer refs.Close()

	var names []string
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsTag() {
			continue
		}
		if _, err := r.inner.TagObject(ref.Hash()); err == nil {
			// Annotated tag — tag object exists.
			names = append(names, ref.Name().Short())
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err == nil {
			// Lightweight tag — points directly to a commit.
			names = append(names, ref.Name().Short())
		}
	}
	sort.Strings(names)
	return names, nil
}

// TagDetail looks up a tag by short name, returning ref details and message.
func (r *Repository) TagDetail(tagName string) (*TagDetail, error) {
	ref, err := r.inner.Reference(plumbing.NewTagReferenceName(tagName), true)
	if err != nil {
		return nil, err
	}

	var commitHash string
	var message string
	var when time.Time

	tagObj, err := r.inner.TagObject(ref.Hash())
	if err == nil {
		// Annotated tag — embed the annotation message.
		message = tagObj.Message
		commitHash = tagObj.Target.String()
		when = tagObj.Tagger.When
	} else {
		// Lightweight tag — use the commit subject as message.
		commit, err := r.inner.CommitObject(ref.Hash())
		if err != nil {
			return nil, err
		}
		commitHash = commit.Hash.String()
		when = commit.Committer.When
		subject, _ := splitCommitMessage(commit.Message)
		message = subject
	}

	return &TagDetail{
		RefName:    ref.Name().String(),
		CommitHash: commitHash,
		Updated:    humanizeTime(when),
		Message:    firstLine(message),
	}, nil
}

// ---------------------------------------------------------------------------
// Count methods — aggregate stats for project list
// ---------------------------------------------------------------------------

// CountBranches returns the number of branches that point at commits.
func (r *Repository) CountBranches() int {
	refs, err := r.inner.References()
	if err != nil {
		return 0
	}
	defer refs.Close()

	var count int
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsBranch() {
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err != nil {
			continue
		}
		count++
	}
	return count
}

// CountTags returns the number of tags (annotated and lightweight).
func (r *Repository) CountTags() int {
	refs, err := r.inner.References()
	if err != nil {
		return 0
	}
	defer refs.Close()

	var count int
	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if !ref.Name().IsTag() {
			continue
		}
		if _, err := r.inner.TagObject(ref.Hash()); err == nil {
			count++
			continue
		}
		if _, err := r.inner.CommitObject(ref.Hash()); err == nil {
			count++
		}
	}
	return count
}

// CountCommits walks the commit log from the given revision (default branch
// when empty) and returns the total number of reachable commits.
func (r *Repository) CountCommits(revision string) (int, error) {
	if !r.HasRefs() {
		return 0, nil
	}
	if revision == "" {
		revision = r.DefaultRevision()
	}

	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return 0, nil
	}

	iter, err := r.inner.Log(&gogit.LogOptions{From: *hash})
	if err != nil {
		return 0, err
	}
	defer iter.Close()

	count := 0
	for {
		_, err := iter.Next()
		if err != nil {
			break
		}
		count++
	}
	return count, nil
}

// CountFiles counts all files (recursively) in the tree at the given revision
// (default branch when empty).
func (r *Repository) CountFiles(revision string) (int, error) {
	if !r.HasRefs() {
		return 0, nil
	}
	if revision == "" {
		revision = r.DefaultRevision()
	}

	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return 0, nil
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return 0, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return 0, err
	}

	count := 0
	iter := tree.Files()
	defer iter.Close()
	for {
		_, err := iter.Next()
		if err != nil {
			break
		}
		count++
	}
	return count, nil
}

// ---------------------------------------------------------------------------
// Search — file name and text content search via tree walk
// ---------------------------------------------------------------------------

// SearchFiles searches file names in the repository at the given revision.
// It walks the entire tree (or a subtree if Directory is set) and matches
// filenames against the query. For quick search (default), it uses
// case-insensitive contains matching. For advanced search, it uses path.Match
// wildcard matching (* and ?).
func (r *Repository) SearchFiles(ctx context.Context, opts SearchOptions) ([]SearchFileHit, bool, error) {
	if opts.MaxResults <= 0 {
		opts.MaxResults = 15
	}

	hash, err := r.inner.ResolveRevision(plumbing.Revision(opts.Revision))
	if err != nil {
		return nil, false, err
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return nil, false, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return nil, false, err
	}

	// Navigate into subtree if directory is specified.
	if opts.Directory != "" {
		dirTree, dirErr := tree.Tree(opts.Directory)
		if dirErr != nil {
			return nil, false, nil // directory not found → empty results
		}
		tree = dirTree
	}

	// Normalize query for case-insensitive matching.
	query := opts.Query
	if !opts.CaseSensitive {
		query = strings.ToLower(query)
	}

	hits := make([]SearchFileHit, 0, opts.MaxResults)
	iter := tree.Files()
	defer iter.Close()

	for {
		select {
		case <-ctx.Done():
			return hits, false, ctx.Err()
		default:
		}

		file, err := iter.Next()
		if err != nil {
			break // end of iteration
		}

		name := file.Name
		// Extract just the filename (last segment) and full path relative to search root.
		fileName := name
		if idx := strings.LastIndexByte(name, '/'); idx >= 0 {
			fileName = name[idx+1:]
		}

		// Prepend directory prefix to get the full repo-relative path.
		fullPath := name
		if opts.Directory != "" {
			fullPath = opts.Directory + "/" + name
		}

		matchName := fileName
		if !opts.CaseSensitive {
			matchName = strings.ToLower(fileName)
		}

		matched := false
		var matchRange *LinearRange

		if opts.Regex {
			// In file-name search, regex is not the primary use case, but support it.
			if idx := indexOfPattern(matchName, query, opts.CaseSensitive); idx >= 0 {
				matched = true
				matchRange = &LinearRange{From: idx, To: idx + len(query)}
			}
		} else {
			// Try contains first; if that fails, try path.Match for wildcard patterns.
			idx := strings.Index(matchName, query)
			if idx >= 0 {
				matched = true
				matchRange = &LinearRange{From: idx, To: idx + len(query)}
			} else if hasWildcard(query) {
				ok, _ := pathMatch(query, fileName, opts.CaseSensitive)
				if ok {
					matched = true
				}
			}
		}

		if matched {
			hits = append(hits, SearchFileHit{
				FilePath: fullPath,
				FileName: fileName,
				Match:    matchRange,
			})
			if len(hits) >= opts.MaxResults {
				// Check if there are more results.
				_, err := iter.Next()
				return hits, err == nil, nil
			}
		}
	}

	return hits, false, nil
}

// SearchText searches file contents at the given revision for the query.
// It supports regex, whole-word, and case-sensitive matching. Binary files
// are skipped. The optional FileNames parameter restricts the search to
// files matching the given comma-separated glob patterns.
func (r *Repository) SearchText(ctx context.Context, opts SearchOptions) ([]SearchTextHit, bool, error) {
	if opts.MaxResults <= 0 {
		opts.MaxResults = 100
	}

	hash, err := r.inner.ResolveRevision(plumbing.Revision(opts.Revision))
	if err != nil {
		return nil, false, err
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return nil, false, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return nil, false, err
	}

	if opts.Directory != "" {
		dirTree, dirErr := tree.Tree(opts.Directory)
		if dirErr != nil {
			return nil, false, nil
		}
		tree = dirTree
	}

	// Pre-compile regex if needed.
	var regexPattern *regexp.Regexp
	if opts.Regex {
		re, compErr := compileRegex(opts.Query, opts.CaseSensitive)
		if compErr != nil {
			return nil, false, compErr
		}
		regexPattern = re
	}

	// Parse file-name filter patterns.
	var filePatterns []string
	if opts.FileNames != "" {
		for _, p := range strings.Split(opts.FileNames, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				filePatterns = append(filePatterns, p)
			}
		}
	}

	hits := make([]SearchTextHit, 0, opts.MaxResults)
	iter := tree.Files()
	defer iter.Close()

	for {
		select {
		case <-ctx.Done():
			return hits, false, ctx.Err()
		default:
		}

		file, err := iter.Next()
		if err != nil {
			break
		}

		// Filter by file-name patterns.
		if len(filePatterns) > 0 && !matchesAnyPattern(file.Name, filePatterns, opts.CaseSensitive) {
			continue
		}

		// Skip binary files.
		isBin, err := file.IsBinary()
		if err != nil {
			continue
		}
		if isBin {
			continue
		}

		// Read file lines.
		lines, err := file.Lines()
		if err != nil {
			continue
		}

		fullPath := file.Name
		if opts.Directory != "" {
			fullPath = opts.Directory + "/" + file.Name
		}

		for lineIdx, line := range lines {
			lineNo := lineIdx + 1
			matchRange := matchLine(line, opts.Query, opts.CaseSensitive, opts.WholeWord, regexPattern)
			if matchRange != nil {
				hits = append(hits, SearchTextHit{
					FilePath:    fullPath,
					LineNo:      lineNo,
					LineContent: line,
					Match:       matchRange,
				})
				if len(hits) >= opts.MaxResults {
					// Check if more results exist.
					_, nextErr := iter.Next()
					if nextErr == nil {
						return hits, true, nil
					}
					// No more files; check if more lines in current file.
					for j := lineIdx + 1; j < len(lines); j++ {
						mr := matchLine(lines[j], opts.Query, opts.CaseSensitive, opts.WholeWord, regexPattern)
						if mr != nil {
							return hits, true, nil
						}
					}
					return hits, false, nil
				}
			}
		}
	}

	return hits, false, nil
}

// ---------------------------------------------------------------------------
// Search helpers
// ---------------------------------------------------------------------------

func compileRegex(query string, caseSensitive bool) (*regexp.Regexp, error) {
	pattern := query
	if !caseSensitive {
		pattern = "(?i)" + pattern
	}
	return regexp.Compile(pattern)
}

func matchLine(line, query string, caseSensitive, wholeWord bool, regex *regexp.Regexp) *PlanarRange {
	if regex != nil {
		loc := regex.FindStringIndex(line)
		if loc != nil {
			return &PlanarRange{
				FromRow: 0, FromCol: loc[0],
				ToRow: 0, ToCol: loc[1],
			}
		}
		return nil
	}

	searchLine := line
	searchQuery := query
	if !caseSensitive {
		searchLine = strings.ToLower(line)
		searchQuery = strings.ToLower(query)
	}

	for i := 0; i <= len(searchLine)-len(searchQuery); i++ {
		if searchLine[i:i+len(searchQuery)] == searchQuery {
			if wholeWord && !isWordBoundary(searchLine, i, i+len(searchQuery)) {
				continue
			}
			return &PlanarRange{
				FromRow: 0, FromCol: i,
				ToRow: 0, ToCol: i + len(searchQuery),
			}
		}
	}
	return nil
}

func isWordBoundary(s string, start, end int) bool {
	leftOk := start == 0 || !isWordChar(s[start-1])
	rightOk := end >= len(s) || !isWordChar(s[end])
	return leftOk && rightOk
}

func isWordChar(c byte) bool {
	return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9') || c == '_'
}

func hasWildcard(query string) bool {
	return strings.ContainsAny(query, "*?")
}

func pathMatch(pattern, name string, caseSensitive bool) (bool, error) {
	if !caseSensitive {
		pattern = strings.ToLower(pattern)
		name = strings.ToLower(name)
	}
	return matchSimpleGlob(pattern, name)
}

// matchSimpleGlob matches a pattern containing * and ? wildcards against a name.
// Pattern segments are matched against path segments separated by /.
func matchSimpleGlob(pattern, name string) (bool, error) {
	// Simple implementation: treat the whole pattern as matching the whole name.
	return globMatch(pattern, name), nil
}

func globMatch(pattern, name string) bool {
	px, nx := 0, 0
	nextPx, nextNx := 0, 0
	starred := false

	for px < len(pattern) || nx < len(name) {
		if px < len(pattern) {
			c := pattern[px]
			switch c {
			case '?':
				if nx < len(name) {
					px++
					nx++
					continue
				}
			case '*':
				starred = true
				nextPx = px
				nextNx = nx + 1
				px++
				continue
			default:
				if nx < len(name) && (c == name[nx]) {
					px++
					nx++
					continue
				}
			}
		}
		if starred {
			px = nextPx + 1
			nx = nextNx
			if nx < len(name) {
				nextNx++
				continue
			}
		}
		return false
	}
	return true
}

func matchesAnyPattern(fileName string, patterns []string, caseSensitive bool) bool {
	for _, p := range patterns {
		ok, _ := pathMatch(p, fileName, caseSensitive)
		if ok {
			return true
		}
	}
	return false
}

func indexOfPattern(s, query string, caseSensitive bool) int {
	if !caseSensitive {
		s = strings.ToLower(s)
	}
	return strings.Index(s, query)
}

// ListCommits returns up to count commits reachable from revision (default branch when empty).
func (r *Repository) ListCommits(revision string, count int) ([]Commit, error) {
	if !r.HasRefs() {
		return []Commit{}, nil
	}
	if revision == "" {
		revision = r.DefaultRevision()
	}
	if count <= 0 {
		count = 100
	}

	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil, err
	}

	iter, err := r.inner.Log(&gogit.LogOptions{From: *hash})
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
		commits = append(commits, commitFromObject(obj))
	}
	return commits, nil
}

// GetCommit looks up a single commit by full or abbreviated hash.
func (r *Repository) GetCommit(commitHash string) (*Commit, error) {
	if !r.HasRefs() {
		return nil, nil
	}
	hash := plumbing.NewHash(commitHash)
	obj, err := r.inner.CommitObject(hash)
	if err != nil {
		// Try resolving abbreviated hash via rev-parse semantics.
		resolved, resolveErr := r.inner.ResolveRevision(plumbing.Revision(commitHash))
		if resolveErr != nil {
			return nil, err
		}
		obj, err = r.inner.CommitObject(*resolved)
		if err != nil {
			return nil, err
		}
	}
	c := commitFromObject(obj)
	return &c, nil
}

func commitFromObject(obj *object.Commit) Commit {
	subject, body := splitCommitMessage(obj.Message)
	parents := make([]string, 0, len(obj.ParentHashes))
	for _, p := range obj.ParentHashes {
		parents = append(parents, p.String())
	}
	return Commit{
		Hash:         obj.Hash.String(),
		Subject:      subject,
		Body:         body,
		Author:       personFromSignature(obj.Author),
		Committer:    personFromSignature(obj.Committer),
		ParentHashes: parents,
	}
}

func splitCommitMessage(message string) (subject, body string) {
	if idx := strings.Index(message, "\n"); idx >= 0 {
		return message[:idx], strings.TrimPrefix(message[idx+1:], "\n")
	}
	return message, ""
}

func personFromSignature(sig object.Signature) *Person {
	_, offsetSec := sig.When.Zone()
	return &Person{
		Name:         sig.Name,
		EmailAddress: sig.Email,
		When:         sig.When.UnixMilli(),
		TzOffset:     offsetSec / 60,
	}
}

// ---------------------------------------------------------------------------
// Blob — directory listing or file content at revision:path
// ---------------------------------------------------------------------------

// Blob returns the content at revision:path. If the repo has no commits
// yet it returns nil (the API layer sends 404, frontend shows NoCommitsPanel).
// If path is a file it returns file content; otherwise it lists directory entries.
func (r *Repository) Blob(ctx context.Context, revision, path string) (*BlobContent, error) {
	if !r.HasRefs() {
		return nil, nil
	}

	if revision == "" {
		revision = r.DefaultRevision()
	}

	if !r.revisionExists(revision) {
		return nil, nil
	}

	commitHash, err := r.ResolveCommitHash(revision)
	if err != nil {
		return nil, err
	}

	entries, err := r.listTree(revision, path)
	if err == nil {
		return &BlobContent{
			Revision:   revision,
			CommitHash: commitHash,
			Path:       path,
			Type:       "directory",
			Entries:    entries,
		}, nil
	}

	content, size, err := r.readFile(revision, path)
	if err != nil {
		return nil, nil
	}

	return &BlobContent{
		Revision:   revision,
		CommitHash: commitHash,
		Path:       path,
		Type:       "file",
		Content:    content,
		Size:       size,
	}, nil
}

// ---------------------------------------------------------------------------
// Directory listing via go-git tree walk
// ---------------------------------------------------------------------------

func (r *Repository) listTree(revision, path string) ([]BlobEntry, error) {
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil, err
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return nil, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return nil, err
	}

	// If path is set, navigate into the subtree.
	if path != "" {
		tree, err = tree.Tree(path)
		if err != nil {
			return nil, err
		}
	}

	var entries []BlobEntry

	// List only direct children — tree.Files() walks the entire subtree.
	for _, te := range tree.Entries {
		entryPath := te.Name
		if path != "" {
			entryPath = path + "/" + te.Name
		}
		entryType := "file"
		if te.Mode == filemode.Dir {
			entryType = "directory"
		}
		entries = append(entries, BlobEntry{
			Name: te.Name,
			Path: entryPath,
			Type: entryType,
		})
	}

	// Populate last-commit info for each entry.
	for i := range entries {
		entries[i].LastCommit = r.lastCommit(revision, entries[i].Path)
	}

	return entries, nil
}

// ---------------------------------------------------------------------------
// File content via go-git blob read
// ---------------------------------------------------------------------------

func (r *Repository) readFile(revision, path string) (string, int64, error) {
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return "", 0, err
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return "", 0, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return "", 0, err
	}

	file, err := tree.File(path)
	if err != nil {
		return "", 0, err
	}

	reader, err := file.Blob.Reader()
	if err != nil {
		return "", 0, err
	}
	defer reader.Close()

	content, err := io.ReadAll(reader)
	if err != nil {
		return "", 0, err
	}

	return string(content), file.Blob.Size, nil
}

// ---------------------------------------------------------------------------
// Last-commit info for a path
// ---------------------------------------------------------------------------

func (r *Repository) lastCommit(revision, path string) *CommitInfo {
	hash, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	if err != nil {
		return nil
	}

	logOpts := &gogit.LogOptions{
		From:  *hash,
		Order: gogit.LogOrderCommitterTime,
		PathFilter: func(p string) bool {
			return p == path
		},
	}
	iter, err := r.inner.Log(logOpts)
	if err != nil {
		return nil
	}
	defer iter.Close()

	commit, err := iter.Next()
	if err != nil {
		return nil
	}

	return &CommitInfo{
		Author:  commit.Author.Name,
		Message: firstLine(commit.Message),
		When:    humanizeTime(commit.Author.When),
	}
}

// ---------------------------------------------------------------------------
// commit diff
// ---------------------------------------------------------------------------

// DiffCommit returns per-file diffs for a commit against its first parent.
func (r *Repository) DiffCommit(commitHash string) ([]FileDiff, error) {
	if !r.HasRefs() {
		return nil, nil
	}

	hash := plumbing.NewHash(commitHash)
	obj, err := r.inner.CommitObject(hash)
	if err != nil {
		resolved, resolveErr := r.inner.ResolveRevision(plumbing.Revision(commitHash))
		if resolveErr != nil {
			return nil, err
		}
		obj, err = r.inner.CommitObject(*resolved)
		if err != nil {
			return nil, err
		}
	}

	return r.commitDiffs(obj)
}

// commitDiffs returns per-file diffs for a commit object against its first parent.
func (r *Repository) commitDiffs(obj *object.Commit) ([]FileDiff, error) {
	var parent *object.Commit
	parentIter := obj.Parents()
	defer parentIter.Close()
	parent, _ = parentIter.Next() // nil for root commits

	patch, err := obj.Patch(parent)
	if err != nil {
		return nil, err
	}

	filePatches := patch.FilePatches()
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

		adds, dels := 0, 0
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

// singleFilePatch adapts a single fdiff.FilePatch to the fdiff.Patch interface.
type singleFilePatch struct {
	fp fdiff.FilePatch
}

func (p singleFilePatch) FilePatches() []fdiff.FilePatch { return []fdiff.FilePatch{p.fp} }
func (p singleFilePatch) Message() string                { return "" }

// ---------------------------------------------------------------------------
// CommitFile — create or update a file and return the new commit hash
// ---------------------------------------------------------------------------

// CommitFile creates or updates a file on a branch, creates a commit, and
// returns the new commit hash. If the branch does not exist yet, a root
// commit is created.
func (r *Repository) CommitFile(ctx context.Context, branch, filePath, content string, author object.Signature, commitMessage string) (string, error) {
	refName := plumbing.NewBranchReferenceName(branch)
	ref, err := r.inner.Reference(refName, true)

	var oldCommitHash plumbing.Hash
	if err == plumbing.ErrReferenceNotFound {
		oldCommitHash = plumbing.ZeroHash
	} else if err != nil {
		return "", fmt.Errorf("lookup branch %q: %w", branch, err)
	} else {
		oldCommitHash = ref.Hash()
	}

	// Store the new blob.
	blobHash, err := r.storeBlob([]byte(content))
	if err != nil {
		return "", fmt.Errorf("store blob: %w", err)
	}

	// Build the new tree — either from scratch (root) or by modifying the
	// current tree.
	var newTreeHash plumbing.Hash
	if oldCommitHash == plumbing.ZeroHash {
		newTreeHash, err = r.buildTree(strings.Split(filePath, "/"), blobHash)
	} else {
		oldCommit, commitErr := r.inner.CommitObject(oldCommitHash)
		if commitErr != nil {
			return "", fmt.Errorf("load commit: %w", commitErr)
		}
		oldTree, treeErr := oldCommit.Tree()
		if treeErr != nil {
			return "", fmt.Errorf("load tree: %w", treeErr)
		}
		newTreeHash, err = r.setTreeEntry(oldTree, strings.Split(filePath, "/"), blobHash)
	}
	if err != nil {
		return "", fmt.Errorf("build tree: %w", err)
	}

	// Create the commit object.
	var parentHashes []plumbing.Hash
	if oldCommitHash != plumbing.ZeroHash {
		parentHashes = []plumbing.Hash{oldCommitHash}
	}
	newCommit := &object.Commit{
		Author:       author,
		Committer:    author,
		Message:      commitMessage,
		TreeHash:     newTreeHash,
		ParentHashes: parentHashes,
	}

	commitHash, err := r.storeCommit(newCommit)
	if err != nil {
		return "", fmt.Errorf("store commit: %w", err)
	}

	// Update the branch reference.
	newRef := plumbing.NewHashReference(refName, commitHash)
	if err := r.inner.Storer.SetReference(newRef); err != nil {
		return "", fmt.Errorf("update ref: %w", err)
	}

	return commitHash.String(), nil
}

// storeBlob writes content as a blob object and returns its hash.
func (r *Repository) storeBlob(data []byte) (plumbing.Hash, error) {
	obj := r.inner.Storer.NewEncodedObject()
	obj.SetType(plumbing.BlobObject)
	obj.SetSize(int64(len(data)))
	w, err := obj.Writer()
	if err != nil {
		return plumbing.ZeroHash, err
	}
	defer func() {
		if closeErr := w.Close(); closeErr != nil && err == nil {
			err = closeErr
		}
	}()
	if _, err := w.Write(data); err != nil {
		return plumbing.ZeroHash, err
	}
	return r.inner.Storer.SetEncodedObject(obj)
}

// storeCommit writes a commit object and returns its hash.
func (r *Repository) storeCommit(c *object.Commit) (plumbing.Hash, error) {
	obj := r.inner.Storer.NewEncodedObject()
	if err := c.Encode(obj); err != nil {
		return plumbing.ZeroHash, err
	}
	return r.inner.Storer.SetEncodedObject(obj)
}

// storeTree writes a tree object and returns its hash.
func (r *Repository) storeTree(entries []object.TreeEntry) (plumbing.Hash, error) {
	t := &object.Tree{Entries: entries}
	obj := r.inner.Storer.NewEncodedObject()
	if err := t.Encode(obj); err != nil {
		return plumbing.ZeroHash, err
	}
	return r.inner.Storer.SetEncodedObject(obj)
}

// buildTree creates a tree from scratch for the given path parts and blob hash.
func (r *Repository) buildTree(parts []string, blobHash plumbing.Hash) (plumbing.Hash, error) {
	if len(parts) == 1 {
		entries := []object.TreeEntry{
			{Name: parts[0], Mode: filemode.Regular, Hash: blobHash},
		}
		return r.storeTree(entries)
	}
	subHash, err := r.buildTree(parts[1:], blobHash)
	if err != nil {
		return plumbing.ZeroHash, err
	}
	entries := []object.TreeEntry{
		{Name: parts[0], Mode: filemode.Dir, Hash: subHash},
	}
	return r.storeTree(entries)
}

// setTreeEntry returns a new tree hash with the entry at pathParts set to
// blobHash.  Intermediate directories are created when they do not exist.
func (r *Repository) setTreeEntry(tree *object.Tree, pathParts []string, blobHash plumbing.Hash) (plumbing.Hash, error) {
	name := pathParts[0]

	var entryMode filemode.FileMode
	var entryHash plumbing.Hash

	if len(pathParts) == 1 {
		entryMode = filemode.Regular
		entryHash = blobHash
	} else {
		// Navigate into or create the subtree.
		var subTree *object.Tree
		for _, e := range tree.Entries {
			if e.Name == name && e.Mode == filemode.Dir {
				subObj, objErr := r.inner.Storer.EncodedObject(plumbing.TreeObject, e.Hash)
				if objErr == nil {
					subTree = &object.Tree{}
					if decErr := subTree.Decode(subObj); decErr != nil {
						return plumbing.ZeroHash, decErr
					}
				}
				break
			}
		}
		if subTree == nil {
			subTree = &object.Tree{}
		}

		subHash, subErr := r.setTreeEntry(subTree, pathParts[1:], blobHash)
		if subErr != nil {
			return plumbing.ZeroHash, subErr
		}
		entryMode = filemode.Dir
		entryHash = subHash
	}

	// Build new entries list: copy all except the one being replaced, then
	// insert the new one.
	entries := make([]object.TreeEntry, 0, len(tree.Entries)+1)
	replaced := false
	for _, e := range tree.Entries {
		if e.Name == name {
			entries = append(entries, object.TreeEntry{Name: name, Mode: entryMode, Hash: entryHash})
			replaced = true
		} else {
			entries = append(entries, e)
		}
	}
	if !replaced {
		entries = append(entries, object.TreeEntry{Name: name, Mode: entryMode, Hash: entryHash})
	}
	sort.Slice(entries, func(i, j int) bool {
		if entries[i].Mode == filemode.Dir && entries[j].Mode != filemode.Dir {
			return entries[i].Name+"/" < entries[j].Name
		}
		if entries[i].Mode != filemode.Dir && entries[j].Mode == filemode.Dir {
			return entries[i].Name < entries[j].Name+"/"
		}
		return entries[i].Name < entries[j].Name
	})

	return r.storeTree(entries)
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func firstLine(s string) string {
	if idx := strings.Index(s, "\n"); idx >= 0 {
		return s[:idx]
	}
	return s
}

func humanizeTime(t time.Time) string {
	d := time.Since(t)
	switch {
	case d < time.Minute:
		return fmt.Sprintf("%d seconds ago", int(d.Seconds()))
	case d < time.Hour:
		return fmt.Sprintf("%d minutes ago", int(d.Minutes()))
	case d < 24*time.Hour:
		return fmt.Sprintf("%d hours ago", int(d.Hours()))
	case d < 30*24*time.Hour:
		days := int(d.Hours() / 24)
		if days == 1 {
			return "1 day ago"
		}
		return fmt.Sprintf("%d days ago", days)
	case d < 365*24*time.Hour:
		months := int(d.Hours() / 24 / 30)
		if months == 1 {
			return "1 month ago"
		}
		return fmt.Sprintf("%d months ago", months)
	default:
		years := int(d.Hours() / 24 / 365)
		if years == 1 {
			return "1 year ago"
		}
		return fmt.Sprintf("%d years ago", years)
	}
}
