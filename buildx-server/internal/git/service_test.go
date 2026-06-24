package git_test

import (
	"context"
	"os/exec"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestListTagNames(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _, tagName := testutil.SetupBareWithTag(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	names, err := repo.ListTagNames()
	if err != nil {
		t.Fatal(err)
	}
	found := false
	for _, n := range names {
		if n == tagName {
			found = true
			break
		}
	}
	if !found {
		t.Errorf("tag %q not found in %v", tagName, names)
	}
}

func TestTagDetail(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _, tagName := testutil.SetupBareWithTag(t)

	repo, _ := git.Open(bareDir)
	detail, err := repo.TagDetail(tagName)
	if err != nil {
		t.Fatal(err)
	}
	if detail.RefName == "" {
		t.Error("expected non-empty ref name")
	}
	if detail.CommitHash == "" {
		t.Error("expected non-empty commit hash")
	}
}

func TestGetCommit(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, hash := testutil.SetupBareWithCommit(t)

	repo, _ := git.Open(bareDir)
	commit, err := repo.GetCommit(hash)
	if err != nil {
		t.Fatal(err)
	}
	if commit == nil {
		t.Fatal("expected commit")
	}
	if commit.Hash != hash {
		t.Errorf("commit hash = %q, want %q", commit.Hash, hash)
	}
}

func TestGetCommit_nonexistent(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, _ := git.Open(bareDir)
	_, err := repo.GetCommit("0000000000000000000000000000000000000000")
	if err == nil {
		t.Fatal("expected error for nonexistent commit")
	}
}

func TestDiffCommit(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)

	// Add a second commit so there's a diff.
	testutil.CommitFile(t, workDir, "test.txt", "hello world\n", "second commit")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")
	hash2 := testutil.HeadCommit(t, workDir)

	repo, _ := git.Open(bareDir)
	diffs, err := repo.DiffCommit(hash2)
	if err != nil {
		t.Fatal(err)
	}
	if len(diffs) == 0 {
		t.Error("expected at least one file diff")
	}
}

func TestBlob_directory(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)

	// Add a file in a subdirectory.
	testutil.CommitFile(t, workDir, "subdir/file.txt", "hello\n", "add subdir file")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, _ := git.Open(bareDir)
	content, err := repo.Blob(context.Background(), "main", "")
	if err != nil {
		t.Fatal(err)
	}
	if content == nil {
		t.Fatal("expected blob content")
	}
	if content.Type != "directory" {
		t.Errorf("Type = %q, want directory", content.Type)
	}
}

func TestBlob_file(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, _ := git.Open(bareDir)
	content, err := repo.Blob(context.Background(), "main", "README.md")
	if err != nil {
		t.Fatal(err)
	}
	if content == nil {
		t.Fatal("expected blob content")
	}
	if content.Type != "file" {
		t.Errorf("Type = %q, want file", content.Type)
	}
}

func TestListCommits(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, _ := git.Open(bareDir)
	commits, err := repo.ListCommits("", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) == 0 {
		t.Error("expected at least one commit")
	}
}

func TestHasRefs(t *testing.T) {
	dir := t.TempDir()
	gitDir := dir + "/repo.git"
	git.InitBare(gitDir)

	repo, _ := git.Open(gitDir)
	if repo.HasRefs() {
		t.Error("fresh bare repo should have no refs")
	}
}

func TestDefaultRevision_empty(t *testing.T) {
	dir := t.TempDir()
	gitDir := dir + "/repo.git"
	git.InitBare(gitDir)

	repo, _ := git.Open(gitDir)
	rev := repo.DefaultRevision()
	if rev != "main" {
		t.Errorf("default revision on empty repo should be 'main', got %q", rev)
	}
}
