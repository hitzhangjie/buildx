package git

import (
	"context"
	"path/filepath"
	"testing"
	"time"

	"github.com/go-git/go-git/v5/plumbing/object"
)

// setupTestRepo creates a bare git repo and returns the Repository handle.
func setupTestRepo(t *testing.T) *Repository {
	t.Helper()
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "test.git")
	if err := InitBare(gitDir); err != nil {
		t.Fatalf("InitBare: %v", err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	return repo
}

func TestGetOverallContributions_EmptyRepo(t *testing.T) {
	repo := setupTestRepo(t)
	result, err := repo.GetOverallContributions("")
	if err != nil {
		t.Fatalf("GetOverallContributions error: %v", err)
	}
	if len(result) != 0 {
		t.Fatalf("expected empty result, got %d entries", len(result))
	}
}

func TestGetLineIncrements_EmptyRepo(t *testing.T) {
	repo := setupTestRepo(t)
	result, err := repo.GetLineIncrements("")
	if err != nil {
		t.Fatalf("GetLineIncrements error: %v", err)
	}
	if len(result) != 0 {
		t.Fatalf("expected empty result, got %d entries", len(result))
	}
}

func TestGetTopContributors_EmptyRepo(t *testing.T) {
	repo := setupTestRepo(t)
	result, err := repo.GetTopContributors("", 10, "COMMITS", 0, 99999)
	if err != nil {
		t.Fatalf("GetTopContributors error: %v", err)
	}
	if len(result) != 0 {
		t.Fatalf("expected empty result, got %d entries", len(result))
	}
}

// Test epochDay helper.
func TestEpochDay(t *testing.T) {
	// 2024-01-01 00:00:00 UTC
	tm := time.Date(2024, 1, 1, 0, 0, 0, 0, time.UTC)
	day := epochDay(tm)
	// Verify it's an integer division of Unix timestamp.
	expected := int(tm.Unix() / 86400)
	if day != expected {
		t.Fatalf("epochDay: got %d, want %d", day, expected)
	}
}

// Test detectLanguage helper.
func TestDetectLanguage(t *testing.T) {
	tests := []struct {
		ext  string
		want string
	}{
		{".go", "Go"},
		{".ts", "TypeScript"},
		{".tsx", "TypeScript"},
		{".js", "JavaScript"},
		{".java", "Java/Kotlin"},
		{".py", "Python"},
		{".css", "CSS"},
		{".html", "HTML"},
		{".md", "Markdown"},
		{".json", "Configuration"},
		{".sql", "SQL"},
		{".rs", "Rust"},
		{".rb", "Ruby"},
		{".cpp", "C++"},
		{".sh", "Shell"},
		{".unknown", "Other"},
	}
	for _, tc := range tests {
		got := detectLanguage(tc.ext)
		if got != tc.want {
			t.Errorf("detectLanguage(%q) = %q, want %q", tc.ext, got, tc.want)
		}
	}
}

// Test with a real repository that has commits.
func TestCommitInfo_WithData(t *testing.T) {
	repo := setupTestRepo(t)

	now := time.Now()
	alice := object.Signature{Name: "Alice", Email: "alice@example.com", When: now}
	bob := object.Signature{Name: "Bob", Email: "bob@example.com", When: now.Add(time.Hour)}

	// Create a commit with a Go file on main branch.
	_, err := repo.CommitFile(context.Background(), "main", "main.go",
		"package main\n\nfunc main() {\n\tprintln(\"hello\")\n}\n",
		alice, "Initial commit")
	if err != nil {
		t.Skipf("CommitFile not supported on bare repo: %v — skipping integration test", err)
	}

	// Make a second commit.
	_, err = repo.CommitFile(context.Background(), "main", "main.go",
		"package main\n\nfunc main() {\n\tprintln(\"hello\")\n\tprintln(\"world\")\n}\n",
		bob, "Second commit")
	if err != nil {
		t.Fatalf("CommitFile 2: %v", err)
	}

	// Test overall contributions.
	contribs, err := repo.GetOverallContributions("main")
	if err != nil {
		t.Fatalf("GetOverallContributions: %v", err)
	}
	if len(contribs) == 0 {
		t.Fatal("expected contributions, got none")
	}

	// Test line increments.
	incs, err := repo.GetLineIncrements("main")
	if err != nil {
		t.Fatalf("GetLineIncrements: %v", err)
	}
	if len(incs) == 0 {
		t.Fatal("expected line increments, got none")
	}

	// Test top contributors.
	today := int(time.Now().Unix() / 86400)
	top, err := repo.GetTopContributors("main", 10, "COMMITS", 0, today)
	if err != nil {
		t.Fatalf("GetTopContributors: %v", err)
	}
	if len(top) == 0 {
		t.Fatal("expected top contributors, got none")
	}
}
