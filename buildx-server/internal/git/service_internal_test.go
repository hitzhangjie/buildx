package git

import (
	"testing"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
)

func TestFirstLine(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{"", ""},
		{"single line", "single line"},
		{"first\nsecond", "first"},
		{"first\nsecond\nthird", "first"},
		{"\nleading newline", ""},
	}
	for _, tc := range tests {
		got := firstLine(tc.in)
		if got != tc.want {
			t.Errorf("firstLine(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestSplitCommitMessage(t *testing.T) {
	tests := []struct {
		message      string
		wantSubject  string
		wantBody     string
	}{
		{"", "", ""},
		{"subject only", "subject only", ""},
		{"subject\n\nbody", "subject", "body"},
		{"subject\nbody", "subject", "body"},
		{"subject\n\nmulti\nline\nbody", "subject", "multi\nline\nbody"},
	}
	for _, tc := range tests {
		subj, body := splitCommitMessage(tc.message)
		if subj != tc.wantSubject {
			t.Errorf("splitCommitMessage(%q) subject = %q, want %q", tc.message, subj, tc.wantSubject)
		}
		if body != tc.wantBody {
			t.Errorf("splitCommitMessage(%q) body = %q, want %q", tc.message, body, tc.wantBody)
		}
	}
}

func TestHumanizeTime(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name   string
		when   time.Time
		hasStr string
	}{
		{"seconds", now.Add(-30 * time.Second), "seconds ago"},
		{"minutes", now.Add(-5 * time.Minute), "minutes ago"},
		{"hours", now.Add(-3 * time.Hour), "hours ago"},
		{"days", now.Add(-5 * 24 * time.Hour), "days ago"},
		{"months", now.Add(-60 * 24 * time.Hour), "months ago"},
		{"years", now.Add(-400 * 24 * time.Hour), "year"},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := humanizeTime(tc.when)
			if len(got) == 0 {
				t.Error("humanizeTime returned empty string")
			}
			if !containsStr(got, tc.hasStr) {
				t.Errorf("humanizeTime = %q, expected to contain %q", got, tc.hasStr)
			}
		})
	}
}

func TestPersonFromSignature(t *testing.T) {
	tz, _ := time.LoadLocation("Asia/Shanghai")
	sig := object.Signature{
		Name:  "Alice",
		Email: "alice@example.com",
		When:  time.Date(2025, 1, 15, 10, 30, 0, 0, tz),
	}
	p := personFromSignature(sig)
	if p.Name != "Alice" {
		t.Errorf("Name = %q, want Alice", p.Name)
	}
	if p.EmailAddress != "alice@example.com" {
		t.Errorf("EmailAddress = %q", p.EmailAddress)
	}
	if p.When == 0 {
		t.Error("When should not be zero")
	}
}

func TestCommitFromObject(t *testing.T) {
	// Create a minimal commit via go-git plumbing.
	hash := plumbing.ComputeHash(plumbing.CommitObject, []byte("test"))
	parentHash := plumbing.ComputeHash(plumbing.CommitObject, []byte("parent"))
	obj := &object.Commit{
		Hash:    hash,
		Message: "subject line\n\nbody text",
		Author: object.Signature{
			Name:  "Bob",
			Email: "bob@example.com",
			When:  time.Now(),
		},
		Committer: object.Signature{
			Name:  "Bob",
			Email: "bob@example.com",
			When:  time.Now(),
		},
		ParentHashes: []plumbing.Hash{parentHash},
	}

	c := commitFromObject(obj)
	if c.Hash != hash.String() {
		t.Errorf("Hash = %q, want %q", c.Hash, hash.String())
	}
	if c.Subject != "subject line" {
		t.Errorf("Subject = %q, want %q", c.Subject, "subject line")
	}
	if c.Body != "body text" {
		t.Errorf("Body = %q, want %q", c.Body, "body text")
	}
	if len(c.ParentHashes) != 1 || c.ParentHashes[0] != parentHash.String() {
		t.Error("ParentHashes mismatch")
	}
	if c.Author.Name != "Bob" {
		t.Error("Author name mismatch")
	}
}

func containsStr(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

// Ensure go-git import is used (for commitFromObject test scaffolding).
var _ = gogit.Clone

func TestCommitFile_NewFile(t *testing.T) {
	dir := t.TempDir()
	if err := InitBare(dir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	author := object.Signature{
		Name:  "Test User",
		Email: "test@example.com",
		When:  time.Now(),
	}

	// First commit creates the branch as a root commit.
	hash1, err := repo.CommitFile(t.Context(), "main", "README.md", "# Hello\n", author, "add readme")
	if err != nil {
		t.Fatalf("first CommitFile failed: %v", err)
	}
	if hash1 == "" {
		t.Fatal("expected non-empty commit hash")
	}

	// Verify the branch now exists and points to our commit.
	ref, err := repo.Inner().Reference(plumbing.NewBranchReferenceName("main"), true)
	if err != nil {
		t.Fatalf("branch lookup: %v", err)
	}
	if ref.Hash().String() != hash1 {
		t.Fatalf("branch ref %s != commit %s", ref.Hash().String(), hash1)
	}

	// Read back the file content.
	blob, err := repo.Blob(t.Context(), "main", "README.md")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil || blob.Type != "file" {
		t.Fatal("expected file blob")
	}
	if blob.Content != "# Hello\n" {
		t.Fatalf("content = %q, want %q", blob.Content, "# Hello\n")
	}
}

func TestCommitFile_UpdateExisting(t *testing.T) {
	dir := t.TempDir()
	if err := InitBare(dir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	author := object.Signature{
		Name:  "Test User",
		Email: "test@example.com",
		When:  time.Now(),
	}

	_, err = repo.CommitFile(t.Context(), "main", "a.txt", "v1\n", author, "first")
	if err != nil {
		t.Fatal(err)
	}

	// Update the same file.
	hash2, err := repo.CommitFile(t.Context(), "main", "a.txt", "v2\n", author, "second")
	if err != nil {
		t.Fatalf("second CommitFile failed: %v", err)
	}
	if hash2 == "" {
		t.Fatal("expected non-empty commit hash")
	}

	blob, err := repo.Blob(t.Context(), "main", "a.txt")
	if err != nil {
		t.Fatal(err)
	}
	if blob.Content != "v2\n" {
		t.Fatalf("content = %q, want %q", blob.Content, "v2\n")
	}
}

func TestCommitFile_NestedDirectories(t *testing.T) {
	dir := t.TempDir()
	if err := InitBare(dir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	author := object.Signature{
		Name:  "Test User",
		Email: "test@examle.com",
		When:  time.Now(),
	}

	_, err = repo.CommitFile(t.Context(), "main", "src/lib/util.go", "package lib\n", author, "add util")
	if err != nil {
		t.Fatal(err)
	}

	// Verify intermediate directories exist.
	blob, err := repo.Blob(t.Context(), "main", "src")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil || blob.Type != "directory" {
		t.Fatal("expected directory at src/")
	}

	blob, err = repo.Blob(t.Context(), "main", "src/lib")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil || blob.Type != "directory" {
		t.Fatal("expected directory at src/lib/")
	}

	// Verify file content.
	blob, err = repo.Blob(t.Context(), "main", "src/lib/util.go")
	if err != nil {
		t.Fatal(err)
	}
	if blob.Content != "package lib\n" {
		t.Fatalf("content = %q", blob.Content)
	}
}

func TestCommitFile_MultipleFiles(t *testing.T) {
	dir := t.TempDir()
	if err := InitBare(dir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	author := object.Signature{
		Name:  "Test User",
		Email: "test@example.com",
		When:  time.Now(),
	}

	_, err = repo.CommitFile(t.Context(), "main", "a.txt", "a\n", author, "add a")
	if err != nil {
		t.Fatal(err)
	}
	_, err = repo.CommitFile(t.Context(), "main", "b.txt", "b\n", author, "add b")
	if err != nil {
		t.Fatal(err)
	}

	// Both files should exist in the latest tree.
	blob, err := repo.Blob(t.Context(), "main", "")
	if err != nil {
		t.Fatal(err)
	}
	if blob == nil || blob.Type != "directory" {
		t.Fatal("expected directory listing")
	}

	foundA, foundB := false, false
	for _, e := range blob.Entries {
		if e.Name == "a.txt" {
			foundA = true
		}
		if e.Name == "b.txt" {
			foundB = true
		}
	}
	if !foundA {
		t.Error("a.txt missing from tree")
	}
	if !foundB {
		t.Error("b.txt missing from tree")
	}
}
