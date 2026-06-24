package git

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"testing"
)

func TestBlobListingEmptyBareRepo(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("HasRefs=%v DefaultRevision=%q", repo.HasRefs(), repo.DefaultRevision())
	blob, err := repo.Blob(context.Background(), "", "")
	if err != nil {
		t.Fatal(err)
	}
	if blob != nil {
		t.Fatalf("expected nil blob for empty repo, got type=%s entries=%d", blob.Type, len(blob.Entries))
	}
}

func TestBlobListingAfterPush(t *testing.T) {
	dir := t.TempDir()
	work := filepath.Join(dir, "work")
	gitDir := filepath.Join(dir, "git")
	if err := os.MkdirAll(work, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command(args[0], args[1:]...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%v: %s", err, out)
		}
	}
	run("git", "-C", work, "init")
	run("git", "-C", work, "config", "user.email", "t@t.com")
	run("git", "-C", work, "config", "user.name", "t")
	if err := os.WriteFile(filepath.Join(work, "README.md"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("git", "-C", work, "add", ".")
	run("git", "-C", work, "commit", "-m", "init")
	run("git", "-C", work, "branch", "-M", "main")
	run("git", "-C", work, "remote", "add", "origin", gitDir)
	run("git", "-C", work, "push", "-u", "origin", "main")

	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}
	t.Logf("HasRefs=%v DefaultRevision=%q", repo.HasRefs(), repo.DefaultRevision())
	blob, err := repo.Blob(context.Background(), "", "")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil {
		t.Fatal("blob is nil after push")
	}
	t.Logf("blob type=%s entries=%d revision=%q", blob.Type, len(blob.Entries), blob.Revision)
	for _, e := range blob.Entries {
		t.Logf("  entry: name=%q path=%q type=%s", e.Name, e.Path, e.Type)
	}
	if len(blob.Entries) == 0 {
		t.Fatal("expected entries after push")
	}
}

func TestListBranchNamesAfterPush(t *testing.T) {
	dir := t.TempDir()
	work := filepath.Join(dir, "work")
	gitDir := filepath.Join(dir, "git")
	if err := os.MkdirAll(work, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command(args[0], args[1:]...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%v: %s", err, out)
		}
	}
	run("git", "-C", work, "init")
	run("git", "-C", work, "config", "user.email", "t@t.com")
	run("git", "-C", work, "config", "user.name", "t")
	if err := os.WriteFile(filepath.Join(work, "README.md"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("git", "-C", work, "add", ".")
	run("git", "-C", work, "commit", "-m", "init")
	run("git", "-C", work, "branch", "-M", "main")
	run("git", "-C", work, "remote", "add", "origin", gitDir)
	run("git", "-C", work, "push", "-u", "origin", "main")

	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}
	names, err := repo.ListBranchNames()
	if err != nil {
		t.Fatal(err)
	}
	if len(names) != 1 || names[0] != "main" {
		t.Fatalf("names=%v want [main]", names)
	}
	detail, err := repo.BranchDetail("main")
	if err != nil {
		t.Fatal(err)
	}
	if detail.CommitHash == "" || detail.RefName != "refs/heads/main" {
		t.Fatalf("detail=%+v", detail)
	}
}

func TestListCommitsAfterPush(t *testing.T) {
	dir := t.TempDir()
	work := filepath.Join(dir, "work")
	gitDir := filepath.Join(dir, "git")
	if err := os.MkdirAll(work, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command(args[0], args[1:]...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%v: %s", err, out)
		}
	}
	run("git", "-C", work, "init")
	run("git", "-C", work, "config", "user.email", "t@t.com")
	run("git", "-C", work, "config", "user.name", "t")
	if err := os.WriteFile(filepath.Join(work, "README.md"), []byte("hello"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("git", "-C", work, "add", ".")
	run("git", "-C", work, "commit", "-m", "init")
	run("git", "-C", work, "branch", "-M", "main")
	run("git", "-C", work, "remote", "add", "origin", gitDir)
	run("git", "-C", work, "push", "-u", "origin", "main")

	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}
	commits, err := repo.ListCommits("", 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("commits=%d want 1", len(commits))
	}
	if commits[0].Subject != "init" {
		t.Fatalf("subject=%q want init", commits[0].Subject)
	}
	if commits[0].Author == nil || commits[0].Author.Name != "t" {
		t.Fatalf("author=%+v", commits[0].Author)
	}
}

func TestBlobLastCommitForDirectories(t *testing.T) {
	dir := t.TempDir()
	work := filepath.Join(dir, "work")
	gitDir := filepath.Join(dir, "git")
	if err := os.MkdirAll(work, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	run := func(args ...string) {
		t.Helper()
		cmd := exec.Command(args[0], args[1:]...)
		if out, err := cmd.CombinedOutput(); err != nil {
			t.Fatalf("%v: %s", err, out)
		}
	}
	run("git", "-C", work, "init")
	run("git", "-C", work, "config", "user.email", "t@t.com")
	run("git", "-C", work, "config", "user.name", "t")
	// Create a file in a subdirectory
	subdir := filepath.Join(work, "src")
	if err := os.MkdirAll(subdir, 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(subdir, "main.go"), []byte("package main"), 0o644); err != nil {
		t.Fatal(err)
	}
	run("git", "-C", work, "add", ".")
	run("git", "-C", work, "commit", "-m", "add src/main.go")
	run("git", "-C", work, "branch", "-M", "main")
	run("git", "-C", work, "remote", "add", "origin", gitDir)
	run("git", "-C", work, "push", "-u", "origin", "main")

	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}
	blob, err := repo.Blob(context.Background(), "", "")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil {
		t.Fatal("blob is nil")
	}
	for _, e := range blob.Entries {
		t.Logf("entry: name=%q path=%q type=%s lastCommit=%+v", e.Name, e.Path, e.Type, e.LastCommit)
		if e.LastCommit == nil {
			t.Errorf("entry %q (type=%s) has nil LastCommit", e.Path, e.Type)
		}
	}
}
