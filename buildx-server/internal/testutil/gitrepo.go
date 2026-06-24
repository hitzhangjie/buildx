// Package testutil provides test helpers for git repositories, SQLite databases,
// and mock service implementations used across buildx-server tests.
package testutil

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

// InitBareRepo creates a bare git repository at dir using the system git CLI.
// It is idempotent — if the directory already contains a git repo, it succeeds.
func InitBareRepo(tb testing.TB, dir string) {
	tb.Helper()
	if err := os.MkdirAll(dir, 0o750); err != nil {
		tb.Fatalf("mkdir %s: %v", dir, err)
	}
	runGit(tb, dir, "init", "--bare", ".")
}

// InitWorkRepo creates a non-bare git repository at dir and configures a
// test user.name / user.email so commits succeed.
func InitWorkRepo(tb testing.TB, dir string) {
	tb.Helper()
	if err := os.MkdirAll(dir, 0o750); err != nil {
		tb.Fatalf("mkdir %s: %v", dir, err)
	}
	runGit(tb, dir, "init")
	runGit(tb, dir, "config", "user.name", "test")
	runGit(tb, dir, "config", "user.email", "test@test.com")
}

// CommitFile writes content to filename in repoDir, stages it, and commits.
// Returns the full commit hash.
func CommitFile(tb testing.TB, repoDir, filename, content, message string) string {
	tb.Helper()
	path := filepath.Join(repoDir, filename)
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		tb.Fatalf("mkdir: %v", err)
	}
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		tb.Fatalf("write file: %v", err)
	}
	runGit(tb, repoDir, "add", filename)
	runGit(tb, repoDir, "commit", "-m", message)
	return HeadCommit(tb, repoDir)
}

// Push pushes a refspec from srcDir to the given remote URL.
func Push(tb testing.TB, srcDir, remoteURL, refspec string) {
	tb.Helper()
	runGit(tb, srcDir, "push", remoteURL, refspec)
}

// AddTag creates an annotated tag at the given revision.
func AddTag(tb testing.TB, repoDir, tagName, revision, message string) {
	tb.Helper()
	runGit(tb, repoDir, "tag", "-a", tagName, "-m", message, revision)
}

// HeadCommit returns the full SHA of HEAD in repoDir.
func HeadCommit(tb testing.TB, repoDir string) string {
	tb.Helper()
	cmd := exec.Command("git", "-C", repoDir, "rev-parse", "HEAD")
	out, err := cmd.Output()
	if err != nil {
		tb.Fatalf("git rev-parse: %v", err)
	}
	return string(out[:len(out)-1]) // strip trailing newline
}

// SetupBareWithCommit creates a bare repo, a working repo with one commit,
// and pushes the commit to the bare repo. Returns (bareDir, workDir, commitHash).
func SetupBareWithCommit(tb testing.TB) (bareDir, workDir, commitHash string) {
	tb.Helper()
	bareDir = tb.TempDir()
	workDir = tb.TempDir()

	InitBareRepo(tb, bareDir)
	InitWorkRepo(tb, workDir)
	hash := CommitFile(tb, workDir, "README.md", "# test\n", "initial commit")
	Push(tb, workDir, bareDir, "HEAD:refs/heads/main")

	return bareDir, workDir, hash
}

// SetupBareWithBranch creates a bare repo, working repo with a commit on a
// named branch, and pushes it. Returns (bareDir, workDir, commitHash).
func SetupBareWithBranch(tb testing.TB, branch string) (bareDir, workDir, commitHash string) {
	tb.Helper()
	bareDir = tb.TempDir()
	workDir = tb.TempDir()

	InitBareRepo(tb, bareDir)
	InitWorkRepo(tb, workDir)
	hash := CommitFile(tb, workDir, "README.md", "# test\n", "initial commit")
	Push(tb, workDir, bareDir, "HEAD:refs/heads/"+branch)

	return bareDir, workDir, hash
}

// SetupBareWithTag creates a bare repo, working repo with a commit and an
// annotated tag pushed to the bare repo. Returns (bareDir, workDir, commitHash, tagName).
func SetupBareWithTag(tb testing.TB) (bareDir, workDir, commitHash, tagName string) {
	tb.Helper()
	bareDir, workDir, hash := SetupBareWithCommit(tb)
	AddTag(tb, workDir, "v1.0.0", "HEAD", "first release")
	Push(tb, workDir, bareDir, "refs/tags/v1.0.0")
	return bareDir, workDir, hash, "v1.0.0"
}

// GitDir returns the path to the git directory for a project under dataDir.
func GitDir(dataDir string, projectID int64) string {
	return filepath.Join(dataDir, "site", "projects", fmt.Sprintf("%d", projectID), "git")
}

func runGit(tb testing.TB, dir string, args ...string) {
	tb.Helper()
	if _, err := exec.LookPath("git"); err != nil {
		tb.Skip("git not found in PATH")
	}
	cmd := exec.Command("git", append([]string{"-C", dir}, args...)...)
	cmd.Stderr = os.Stderr
	if out, err := cmd.Output(); err != nil {
		tb.Fatalf("git %v: %v\n%s", args, err, out)
	}
}
