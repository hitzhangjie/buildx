package git

import (
	"context"
	"fmt"
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

// HasRefs returns true if the repository has at least one ref (commit).
func (s *CommandService) HasRefs() bool {
	cmd := exec.Command("git", "for-each-ref", "--count=1", "refs/")
	cmd.Dir = s.gitDir
	out, err := cmd.Output()
	if err != nil {
		return false
	}
	return strings.TrimSpace(string(out)) == "1"
}

// DefaultRevision returns the default branch name, or "main" if none exists.
func (s *CommandService) DefaultRevision() string {
	// Try to resolve HEAD
	cmd := exec.Command("git", "symbolic-ref", "--short", "HEAD")
	cmd.Dir = s.gitDir
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
	cmd := exec.Command("git", "rev-parse", "--verify", revision)
	cmd.Dir = s.gitDir
	return cmd.Run() == nil
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
	cmd := exec.CommandContext(ctx, "git", "ls-tree", "-l", "--full-tree", treeRef)
	cmd.Dir = s.gitDir
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
	cmd := exec.Command("git", "log", "-1", "--format=%an|%s|%ar", revision, "--", path)
	cmd.Dir = s.gitDir
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
	cmd := exec.CommandContext(ctx, "git", "show", ref)
	cmd.Dir = s.gitDir
	out, err := cmd.Output()
	if err != nil {
		return "", 0, err
	}

	// Get size in bytes
	sizeCmd := exec.CommandContext(ctx, "git", "cat-file", "-s", ref)
	sizeCmd.Dir = s.gitDir
	sizeOut, err := sizeCmd.Output()
	size := int64(0)
	if err == nil {
		fmt.Sscanf(strings.TrimSpace(string(sizeOut)), "%d", &size)
	}

	return string(out), size, nil
}
