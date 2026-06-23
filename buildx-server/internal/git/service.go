package git

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/filemode"
)

// ---------------------------------------------------------------------------
// Ref introspection
// ---------------------------------------------------------------------------

// HasRefs returns true if the repository has at least one reference.
func (r *Repository) HasRefs() bool {
	refs, err := r.inner.References()
	if err != nil {
		slog.Error("go-git References failed", "error", err)
		return false
	}
	defer refs.Close()
	_, err = refs.Next()
	return err == nil
}

// DefaultRevision returns the default branch name, or "main" if none exists.
func (r *Repository) DefaultRevision() string {
	head, err := r.inner.Head()
	if err == nil {
		ref := head.Name()
		if ref.IsBranch() {
			return ref.Short()
		}
	}
	for _, name := range []string{"main", "master"} {
		if r.revisionExists(name) {
			return name
		}
	}
	return "main"
}

func (r *Repository) revisionExists(revision string) bool {
	_, err := r.inner.ResolveRevision(plumbing.Revision(revision))
	return err == nil
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
		if path == "" {
			return &BlobContent{
				Revision: revision,
				Path:     path,
				Type:     "directory",
				Entries:  []BlobEntry{},
			}, nil
		}
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

	// Add files (blobs) from the tree.
	iter := tree.Files()
	defer iter.Close()
	for {
		file, err := iter.Next()
		if err != nil {
			break
		}
		entryPath := file.Name
		if path != "" {
			entryPath = path + "/" + file.Name
		}
		entries = append(entries, BlobEntry{
			Name: file.Name,
			Path: entryPath,
			Type: "file",
		})
	}

	// Add subdirectory entries.
	for _, te := range tree.Entries {
		if te.Mode == filemode.Dir {
			entryPath := te.Name
			if path != "" {
				entryPath = path + "/" + te.Name
			}
			entries = append(entries, BlobEntry{
				Name: te.Name,
				Path: entryPath,
				Type: "directory",
			})
		}
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
