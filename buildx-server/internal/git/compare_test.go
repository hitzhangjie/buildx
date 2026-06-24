package git_test

import (
	"os/exec"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestMergeBase_sameBranch(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, hash := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	base, err := repo.MergeBase("main", hash)
	if err != nil {
		t.Fatal(err)
	}
	if base != hash {
		t.Fatalf("merge base = %q, want %q", base, hash)
	}
}

func TestMergeBase_featureBranch(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, baseHash := testutil.SetupBareWithCommit(t)

	testutil.CommitFile(t, workDir, "feature.txt", "feature\n", "feature commit")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/feature")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	base, err := repo.MergeBase("main", "feature")
	if err != nil {
		t.Fatal(err)
	}
	if base != baseHash {
		t.Fatalf("merge base = %q, want %q", base, baseHash)
	}
}

func TestDiffRevisions(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, baseHash := testutil.SetupBareWithCommit(t)

	testutil.CommitFile(t, workDir, "changed.txt", "new content\n", "second commit")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	diffs, err := repo.DiffRevisions(baseHash, "main", git.WhitespaceIgnoreTrailing)
	if err != nil {
		t.Fatal(err)
	}
	if len(diffs) == 0 {
		t.Fatal("expected at least one diff")
	}
	found := false
	for _, d := range diffs {
		if d.Path == "changed.txt" {
			found = true
			if d.Additions == 0 {
				t.Error("expected additions > 0")
			}
		}
	}
	if !found {
		t.Fatalf("changed.txt not in diffs: %+v", diffs)
	}
}

func TestListCommitsSince(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, baseHash := testutil.SetupBareWithCommit(t)

	testutil.CommitFile(t, workDir, "a.txt", "a\n", "second")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")
	testutil.CommitFile(t, workDir, "b.txt", "b\n", "third")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	commits, err := repo.ListCommitsSince(baseHash, "main", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 2 {
		t.Fatalf("got %d commits, want 2", len(commits))
	}
}

func TestFilterDiffsByPath(t *testing.T) {
	diffs := []git.FileDiff{
		{Path: "src/main.go"},
		{Path: "docs/readme.md"},
	}
	filtered := git.FilterDiffsByPath(diffs, "src/*")
	if len(filtered) != 1 || filtered[0].Path != "src/main.go" {
		t.Fatalf("unexpected filter result: %+v", filtered)
	}
}
