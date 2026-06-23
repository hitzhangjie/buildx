package git

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"sort"
	"strings"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/filemode"
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

// BranchDetail is the REST shape for a single branch ref.
type BranchDetail struct {
	RefName    string `json:"refName"`
	CommitHash string `json:"commitHash"`
	Updated    string `json:"updated,omitempty"`
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

// ---------------------------------------------------------------------------
// Commits — log walk for REST commits list
// ---------------------------------------------------------------------------

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

	entries, err := r.listTree(revision, path)
	if err == nil {
		return &BlobContent{
			Revision: revision,
			Path:     path,
			Type:     "directory",
			Entries:  entries,
		}, nil
	}

	content, size, err := r.readFile(revision, path)
	if err != nil {
		return nil, nil
	}

	return &BlobContent{
		Revision: revision,
		Path:     path,
		Type:     "file",
		Content:  content,
		Size:     size,
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
