package git

import (
	"os"
	"path/filepath"
	"testing"
)

func TestInitBare(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "repo.git")

	if err := InitBare(gitDir); err != nil {
		t.Fatalf("InitBare: %v", err)
	}

	// Verify HEAD exists — marker of a valid git repo.
	if _, err := os.Stat(filepath.Join(gitDir, "HEAD")); os.IsNotExist(err) {
		t.Error("HEAD not created")
	}
}

func TestInitBare_idempotent(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "repo.git")

	if err := InitBare(gitDir); err != nil {
		t.Fatalf("first InitBare: %v", err)
	}
	// Second call should succeed without error.
	if err := InitBare(gitDir); err != nil {
		t.Fatalf("second InitBare: %v", err)
	}
}

func TestOpen(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "repo.git")
	InitBare(gitDir)

	repo, err := Open(gitDir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	if repo == nil {
		t.Fatal("expected non-nil repo")
	}
	if repo.Inner() == nil {
		t.Fatal("expected non-nil inner repo")
	}
}

func TestOpen_nonexistent(t *testing.T) {
	_, err := Open("/nonexistent/path/that/does/not/exist.git")
	if err == nil {
		t.Fatal("expected error for nonexistent path")
	}
}

func TestRepositoryInner(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "repo.git")
	InitBare(gitDir)

	repo, _ := Open(gitDir)
	inner := repo.Inner()
	if inner == nil {
		t.Fatal("Inner() returned nil")
	}
}
