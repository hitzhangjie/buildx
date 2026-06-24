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

// ProjectStats holds aggregate counts for a project's git repository.
type ProjectStats struct {
	FileCount      int `json:"fileCount"`
	CommitCount    int `json:"commitCount"`
	BranchCount    int `json:"branchCount"`
	TagCount       int `json:"tagCount"`
	WorkspaceCount int `json:"workspaceCount"`
}

// BlobContent is the result for a blob request — either a directory listing
// or file content, matching the frontend's BlobContent shape.
type BlobContent struct {
	Revision   string      `json:"revision"`
	CommitHash string      `json:"commitHash,omitempty"`
	Path       string      `json:"path"`
	Type       string      `json:"type"` // "directory" or "file"
	Entries    []BlobEntry `json:"entries,omitempty"`
	Content    string      `json:"content,omitempty"`
	Size       int64       `json:"size,omitempty"`
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

// ---------------------------------------------------------------------------
// Search types
// ---------------------------------------------------------------------------

// LinearRange describes a contiguous range on a single line.
type LinearRange struct {
	From int `json:"from"`
	To   int `json:"to"`
}

// PlanarRange describes a 2-D range (row/col) within a file.
type PlanarRange struct {
	FromRow int `json:"fromRow"`
	FromCol int `json:"fromCol"`
	ToRow   int `json:"toRow"`
	ToCol   int `json:"toCol"`
}

// SearchFileHit is one matched file in a file-name search.
type SearchFileHit struct {
	FilePath string       `json:"filePath"`
	FileName string       `json:"fileName"`
	Match    *LinearRange `json:"match,omitempty"`
}

// SearchTextHit is one matched line in a text-content search.
type SearchTextHit struct {
	FilePath    string       `json:"filePath"`
	LineNo      int          `json:"lineNo"`
	LineContent string       `json:"lineContent"`
	Match       *PlanarRange `json:"match,omitempty"`
}

// SearchSymbolHit is one matched symbol definition in a symbol search.
type SearchSymbolHit struct {
	FilePath    string       `json:"filePath"`
	SymbolName  string       `json:"symbolName"`
	SymbolType  string       `json:"symbolType,omitempty"`
	Namespace   string       `json:"namespace,omitempty"`
	LineNo      int          `json:"lineNo"`
	LineContent string       `json:"lineContent"`
	Match       *LinearRange `json:"match,omitempty"`
}

// SymbolSearchOptions configures a symbol search operation.
type SymbolSearchOptions struct {
	Revision      string
	Query         string
	CaseSensitive bool
	FileNames     string // comma-separated glob patterns
	Directory     string
	MaxResults    int
	Primary       *bool // nil = all symbols, true/false = primary/secondary only
}

// SearchOptions configures a search operation.
type SearchOptions struct {
	Revision      string
	Query         string
	CaseSensitive bool
	Regex         bool
	WholeWord     bool
	FileNames     string // comma-separated glob patterns for file-name filtering
	Directory     string // optional subtree restriction
	MaxResults    int
}
