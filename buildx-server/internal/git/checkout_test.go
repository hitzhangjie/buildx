package git_test

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
)

func TestCheckoutCommitStreamsGitOutput(t *testing.T) {
	t.Helper()
	dir := t.TempDir()
	bare := filepath.Join(dir, "repo.git")
	workDir := filepath.Join(dir, "work")

	initBareRepo(t, bare)
	commit := seedCommit(t, bare)

	var lines []string
	err := git.CheckoutCommit(bare, workDir, commit, git.CheckoutOptions{
		CloneDepth: 1,
		LogLine: func(line string, _ bool) {
			lines = append(lines, line)
		},
	})
	if err != nil {
		t.Fatalf("checkout: %v", err)
	}

	if len(lines) < 2 {
		t.Fatalf("expected git command output lines, got %d: %v", len(lines), lines)
	}
	if !strings.HasPrefix(lines[0], "+ git clone ") {
		t.Fatalf("first line = %q, want git clone command", lines[0])
	}
	foundCloneMsg := false
	for _, line := range lines {
		if strings.Contains(line, "Cloning into") {
			foundCloneMsg = true
			break
		}
	}
	if !foundCloneMsg {
		t.Fatalf("expected clone progress in log, got: %v", lines)
	}
}

func initBareRepo(t *testing.T, bare string) {
	t.Helper()
	runGit(t, "", "init", "--bare", bare)
}

func seedCommit(t *testing.T, bare string) string {
	t.Helper()
	cloneDir := filepath.Join(t.TempDir(), "seed")
	runGit(t, "", "clone", bare, cloneDir)
	readme := filepath.Join(cloneDir, "README.md")
	if err := os.WriteFile(readme, []byte("hello\n"), 0644); err != nil {
		t.Fatal(err)
	}
	runGit(t, cloneDir, "add", "README.md")
	runGit(t, cloneDir, "commit", "-m", "init")
	runGit(t, cloneDir, "push", "origin", "HEAD")
	out := runGit(t, cloneDir, "rev-parse", "HEAD")
	return strings.TrimSpace(string(out))
}

func runGit(t *testing.T, dir string, args ...string) []byte {
	t.Helper()
	cmd := exec.Command("git", args...)
	if dir != "" {
		cmd.Dir = dir
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git %s: %v\n%s", strings.Join(args, " "), err, out)
	}
	return out
}
