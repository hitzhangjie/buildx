package git

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/exec"
	"strings"
)

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

// CommandService runs git commands against a bare repo on disk.
type CommandService struct {
	gitDir string // path to the bare git directory
}

// NewCommandService creates a CommandService for the given project's bare git directory.
func NewCommandService(gitDir string) *CommandService {
	return &CommandService{gitDir: gitDir}
}

// cmd creates an exec.Cmd for git operations with GIT_DIR set explicitly.
// This bypasses the safe.bareRepository=explicit safety check in Git ≥2.35.2
// that otherwise blocks commands running inside bare repositories.
func (s *CommandService) cmd(args ...string) *exec.Cmd {
	c := exec.Command("git", args...)
	c.Dir = s.gitDir
	c.Env = append(os.Environ(), "GIT_DIR="+s.gitDir)
	return c
}

// cmdContext is like cmd but includes a context for cancellation.
func (s *CommandService) cmdContext(ctx context.Context, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, "git", args...)
	c.Dir = s.gitDir
	c.Env = append(os.Environ(), "GIT_DIR="+s.gitDir)
	return c
}

// Cmd creates an exec.Cmd for git operations on a bare repo with GIT_DIR set.
// Exported for use by other packages (e.g. the git HTTP handler).
func Cmd(gitDir string, args ...string) *exec.Cmd {
	c := exec.Command("git", args...)
	c.Dir = gitDir
	c.Env = append(os.Environ(), "GIT_DIR="+gitDir)
	return c
}

// CmdContext is like Cmd but includes a context.
func CmdContext(ctx context.Context, gitDir string, args ...string) *exec.Cmd {
	c := exec.CommandContext(ctx, "git", args...)
	c.Dir = gitDir
	c.Env = append(os.Environ(), "GIT_DIR="+gitDir)
	return c
}

// HasRefs returns true if the repository has at least one ref (commit).
func (s *CommandService) HasRefs() bool {
	cmd := s.cmd("for-each-ref", "--count=1", "--format=%(refname)", "refs/")
	out, err := cmd.Output()
	if err != nil {
		slog.Error("git for-each-ref failed", "gitDir", s.gitDir, "error", err)
		return false
	}
	return strings.TrimSpace(string(out)) != ""
}

// DefaultRevision returns the default branch name, or "main" if none exists.
func (s *CommandService) DefaultRevision() string {
	// Try to resolve HEAD
	cmd := s.cmd("symbolic-ref", "--short", "HEAD")
	out, err := cmd.Output()
	if err == nil {
		ref := strings.TrimSpace(string(out))
		if ref != "" {
			return ref
		}
	}
	// Fallback to checking common branch names
	for _, name := range []string{"main", "master"} {
		if s.revisionExists(name) {
			return name
		}
	}
	return "main"
}

func (s *CommandService) revisionExists(revision string) bool {
	return s.cmd("rev-parse", "--verify", revision).Run() == nil
}

// Blob returns the content at revision:path. If the repo has no commits
// yet it returns an empty directory. If path is a file it returns file
// content; otherwise it lists directory entries.
func (s *CommandService) Blob(ctx context.Context, revision, path string) (*BlobContent, error) {
	// When the repository has no commits yet (no refs), return nil so the
	// API returns 404. The frontend interprets a null response as "no commits"
	// and shows the NoCommitsPanel, matching OneDev behavior.
	if !s.HasRefs() {
		return nil, nil
	}

	if revision == "" {
		revision = s.DefaultRevision()
	}

	if !s.revisionExists(revision) {
		// Revision doesn't exist — return empty directory for root paths,
		// or nil for sub-paths (path not found).
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

	// Try to determine the type by attempting ls-tree on the ref.
	// If it's a directory, ls-tree succeeds. If it's a file, ls-tree fails
	// with a "not a tree object" message.
	entries, err := s.listTree(ctx, revision, path)
	if err == nil {
		return &BlobContent{
			Revision: revision,
			Path:     path,
			Type:     "directory",
			Entries:  entries,
		}, nil
	}

	// It might be a file — try to read it.
	content, size, err := s.readFile(ctx, revision, path)
	if err != nil {
		// Neither directory nor file — path not found.
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

func (s *CommandService) listTree(ctx context.Context, revision, path string) ([]BlobEntry, error) {
	treeRef := revision
	if path != "" {
		treeRef = revision + ":" + path
	}

	// git ls-tree -l --full-tree <tree-ish>
	// Output format: <mode> <type> <object> <size>\t<name>
	cmd := s.cmdContext(ctx, "ls-tree", "-l", "--full-tree", treeRef)
	out, err := cmd.Output()
	if err != nil {
		return nil, err
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	entries := make([]BlobEntry, 0, len(lines))

	for _, line := range lines {
		if line == "" {
			continue
		}
		entry := parseLsTreeLine(line)
		if entry == nil {
			continue
		}
		// Build the full path for this entry
		if path != "" {
			entry.Path = path + "/" + entry.Name
		} else {
			entry.Path = entry.Name
		}

		// Get last commit for this entry
		entry.LastCommit = s.lastCommit(revision, entry.Path)

		entries = append(entries, *entry)
	}

	return entries, nil
}

// parseLsTreeLine parses a line from `git ls-tree -l`.
// Format: <mode> SP <type> SP <object> SP <size> TAB <name>
func parseLsTreeLine(line string) *BlobEntry {
	// Split on tab first to get metadata and name
	parts := strings.SplitN(line, "\t", 2)
	if len(parts) != 2 {
		return nil
	}
	meta := strings.Fields(parts[0])
	name := parts[1]
	if len(meta) < 3 {
		return nil
	}

	entryType := "file"
	if meta[1] == "tree" {
		entryType = "directory"
	} else if meta[1] == "commit" {
		entryType = "directory" // submodule, treat as directory
	}

	return &BlobEntry{
		Name: name,
		Type: entryType,
	}
}

func (s *CommandService) lastCommit(revision, path string) *CommitInfo {
	// git log -1 --format="%an|%s|%ar" <revision> -- <path>
	cmd := s.cmd("log", "-1", "--format=%an|%s|%ar", revision, "--", path)
	out, err := cmd.Output()
	if err != nil {
		return nil
	}

	line := strings.TrimSpace(string(out))
	if line == "" {
		return nil
	}

	parts := strings.SplitN(line, "|", 3)
	info := &CommitInfo{}
	if len(parts) > 0 {
		info.Author = parts[0]
	}
	if len(parts) > 1 {
		info.Message = parts[1]
	}
	if len(parts) > 2 {
		info.When = parts[2]
	}
	return info
}

func (s *CommandService) readFile(ctx context.Context, revision, path string) (string, int64, error) {
	ref := revision + ":" + path

	// Get content
	out, err := s.cmdContext(ctx, "show", ref).Output()
	if err != nil {
		return "", 0, err
	}

	// Get size in bytes
	sizeOut, err := s.cmdContext(ctx, "cat-file", "-s", ref).Output()
	size := int64(0)
	if err == nil {
		fmt.Sscanf(strings.TrimSpace(string(sizeOut)), "%d", &size)
	}

	return string(out), size, nil
}
