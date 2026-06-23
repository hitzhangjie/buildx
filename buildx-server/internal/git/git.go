// Package git provides Git repository operations using go-git (pure Go).
//
// All git operations — blob browsing, smart HTTP protocol, repository
// initialization — are handled through go-git. No system git CLI is required.
//
// Maps to OneDev: io.onedev.server.git.* (Go-git replaces JGit)
package git

import (
	gogit "github.com/go-git/go-git/v5"
)

// ---------------------------------------------------------------------------
// Domain types — shared between blob browsing and protocol handlers
// ---------------------------------------------------------------------------

// BlobEntry describes a single tree entry (file or directory).
type BlobEntry struct {
	Name       string      `json:"name"`
	Path       string      `json:"path"`
	Type       string      `json:"type"` // "file" or "directory"
	LastCommit *CommitInfo `json:"lastCommit,omitempty"`
}

// CommitInfo carries abbreviated commit metadata for a blob listing.
type CommitInfo struct {
	Author  string `json:"author"`
	Message string `json:"message"`
	When    string `json:"when"`
}

// Person matches OneDev REST commit author/committer shape.
type Person struct {
	Name         string `json:"name"`
	EmailAddress string `json:"emailAddress"`
	When         int64  `json:"when"`
	TzOffset     int    `json:"tzOffset"`
}

// Commit matches OneDev REST commit object.
type Commit struct {
	Hash         string     `json:"hash"`
	Subject      string     `json:"subject,omitempty"`
	Body         string     `json:"body,omitempty"`
	Author       *Person    `json:"author,omitempty"`
	Committer    *Person    `json:"committer,omitempty"`
	ParentHashes []string   `json:"parentHashes,omitempty"`
	Diffs        []FileDiff `json:"diffs,omitempty"`
}

// FileDiff describes changes to a single file within a commit.
type FileDiff struct {
	Path      string `json:"path"`
	Additions int    `json:"additions"`
	Deletions int    `json:"deletions"`
	Diff      string `json:"diff"`
}

// BlobContent is the result for a blob request — either a directory listing
// or file content, matching the frontend's BlobContent shape.
type BlobContent struct {
	Revision string      `json:"revision"`
	Path     string      `json:"path"`
	Type     string      `json:"type"` // "directory" or "file"
	Entries  []BlobEntry `json:"entries,omitempty"`
	Content  string      `json:"content,omitempty"`
	Size     int64       `json:"size,omitempty"`
}

// ---------------------------------------------------------------------------
// Repository — wraps *gogit.Repository with higher-level operations
// ---------------------------------------------------------------------------

// Repository wraps a go-git Repository providing buildx-specific helpers
// (blob browsing, smart HTTP protocol).
type Repository struct {
	inner *gogit.Repository
	path  string // filesystem path to the git directory
}

// Open opens an existing git repository at the given path (bare or non-bare).
func Open(path string) (*Repository, error) {
	r, err := gogit.PlainOpen(path)
	if err != nil {
		return nil, err
	}
	return &Repository{inner: r, path: path}, nil
}

// InitBare creates a new bare git repository at the given path.
// The directory must already exist.
func InitBare(path string) error {
	_, err := gogit.PlainInit(path, true)
	if err == gogit.ErrRepositoryAlreadyExists {
		return nil // idempotent
	}
	return err
}

// Inner returns the underlying go-git repository for advanced operations.
func (r *Repository) Inner() *gogit.Repository {
	return r.inner
}
