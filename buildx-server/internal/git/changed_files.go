package git

import (
	"bytes"
	"fmt"
	"os/exec"
	"strings"
)

// ChangedFilesBetween lists paths changed between two commits (exclusive old, inclusive new).
// Returns nil when old is zero or commits are equal.
func (r *Repository) ChangedFilesBetween(oldHash, newHash string) ([]string, error) {
	if IsZeroHash(oldHash) || IsZeroHash(newHash) || oldHash == newHash {
		return nil, nil
	}
	cmd := exec.Command("git", "-C", r.path, "diff", "--name-only", oldHash, newHash)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git diff --name-only: %w (stderr: %s)", err, stderr.String())
	}
	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	if len(lines) == 1 && lines[0] == "" {
		return nil, nil
	}
	return lines, nil
}
