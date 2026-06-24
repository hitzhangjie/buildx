package git

import (
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

// ---------------------------------------------------------------------------
// ParseCommitQuery tests
// ---------------------------------------------------------------------------

func TestParseCommitQuery_Empty(t *testing.T) {
	q, err := ParseCommitQuery("")
	if err != nil {
		t.Fatal(err)
	}
	if !q.IsEmpty() {
		t.Fatal("expected empty query")
	}
}

func TestParseCommitQuery_UntilBranch(t *testing.T) {
	q, err := ParseCommitQuery("until branch(main)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Revisions) != 1 {
		t.Fatalf("expected 1 revision, got %d", len(q.Revisions))
	}
	r := q.Revisions[0]
	if r.Type != RevisionBranch || r.Value != "main" || r.Exclude {
		t.Fatalf("unexpected revision: %+v", r)
	}
}

func TestParseCommitQuery_SinceBranch(t *testing.T) {
	q, err := ParseCommitQuery("since branch(feature/foo)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Revisions) != 1 {
		t.Fatalf("expected 1 revision, got %d", len(q.Revisions))
	}
	r := q.Revisions[0]
	if r.Type != RevisionBranch || r.Value != "feature/foo" || !r.Exclude {
		t.Fatalf("expected exclude=true: %+v", r)
	}
}

func TestParseCommitQuery_UntilTag(t *testing.T) {
	q, err := ParseCommitQuery("until tag(v1.0)")
	if err != nil {
		t.Fatal(err)
	}
	r := q.Revisions[0]
	if r.Type != RevisionTag || r.Value != "v1.0" {
		t.Fatalf("unexpected revision: %+v", r)
	}
}

func TestParseCommitQuery_UntilCommit(t *testing.T) {
	q, err := ParseCommitQuery("until commit(abc123def456)")
	if err != nil {
		t.Fatal(err)
	}
	r := q.Revisions[0]
	if r.Type != RevisionCommit || r.Value != "abc123def456" {
		t.Fatalf("unexpected revision: %+v", r)
	}
}

func TestParseCommitQuery_DefaultBranch(t *testing.T) {
	q, err := ParseCommitQuery("default-branch")
	if err != nil {
		t.Fatal(err)
	}
	if !q.DefaultBranch {
		t.Fatal("expected DefaultBranch=true")
	}
}

func TestParseCommitQuery_BeforeAfter(t *testing.T) {
	q, err := ParseCommitQuery("before(yesterday) after(3 days ago)")
	if err != nil {
		t.Fatal(err)
	}
	if q.Before != "yesterday" {
		t.Fatalf("expected before=yesterday, got %q", q.Before)
	}
	if q.After != "3 days ago" {
		t.Fatalf("expected after=3 days ago, got %q", q.After)
	}
}

func TestParseCommitQuery_Author(t *testing.T) {
	q, err := ParseCommitQuery("author(Robin Shen)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Authors) != 1 || q.Authors[0] != "Robin Shen" {
		t.Fatalf("expected authors=[Robin Shen], got %v", q.Authors)
	}
}

func TestParseCommitQuery_MultipleAuthors(t *testing.T) {
	q, err := ParseCommitQuery("author(robin) author(jack)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Authors) != 2 || q.Authors[0] != "robin" || q.Authors[1] != "jack" {
		t.Fatalf("expected authors=[robin jack], got %v", q.Authors)
	}
}

func TestParseCommitQuery_AuthoredByMe(t *testing.T) {
	q, err := ParseCommitQuery("authored-by-me")
	if err != nil {
		t.Fatal(err)
	}
	if q.ByMe&ByMeAuthor == 0 {
		t.Fatal("expected ByMeAuthor")
	}
}

func TestParseCommitQuery_Committer(t *testing.T) {
	q, err := ParseCommitQuery("committer(bob)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Committers) != 1 || q.Committers[0] != "bob" {
		t.Fatalf("expected committers=[bob], got %v", q.Committers)
	}
}

func TestParseCommitQuery_CommittedByMe(t *testing.T) {
	q, err := ParseCommitQuery("committed-by-me")
	if err != nil {
		t.Fatal(err)
	}
	if q.ByMe&ByMeCommitter == 0 {
		t.Fatal("expected ByMeCommitter")
	}
}

func TestParseCommitQuery_Path(t *testing.T) {
	q, err := ParseCommitQuery("path(src/main/*.go)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Paths) != 1 || q.Paths[0] != "src/main/*.go" {
		t.Fatalf("expected paths=[src/main/*.go], got %v", q.Paths)
	}
}

func TestParseCommitQuery_MultiplePaths(t *testing.T) {
	q, err := ParseCommitQuery("path(src/*.go) path(pkg/*.go)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Paths) != 2 {
		t.Fatalf("expected 2 paths, got %v", q.Paths)
	}
}

func TestParseCommitQuery_Message(t *testing.T) {
	q, err := ParseCommitQuery("message(fix bug)")
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Messages) != 1 || q.Messages[0] != "fix bug" {
		t.Fatalf("expected messages=[fix bug], got %v", q.Messages)
	}
}

func TestParseCommitQuery_OrderByDate(t *testing.T) {
	q, err := ParseCommitQuery("order-by-date")
	if err != nil {
		t.Fatal(err)
	}
	if q.Order != OrderDate {
		t.Fatalf("expected Order=date, got %q", q.Order)
	}
}

func TestParseCommitQuery_OrderByAuthorDate(t *testing.T) {
	q, err := ParseCommitQuery("order-by-author-date")
	if err != nil {
		t.Fatal(err)
	}
	if q.Order != OrderAuthorDate {
		t.Fatalf("expected Order=author-date, got %q", q.Order)
	}
}

func TestParseCommitQuery_OrderByTopo(t *testing.T) {
	q, err := ParseCommitQuery("order-by-topo")
	if err != nil {
		t.Fatal(err)
	}
	if q.Order != OrderTopo {
		t.Fatalf("expected Order=topo, got %q", q.Order)
	}
}

func TestParseCommitQuery_Fuzzy(t *testing.T) {
	q, err := ParseCommitQuery("~fix login bug~")
	if err != nil {
		t.Fatal(err)
	}
	if q.Fuzzy != "fix login bug" {
		t.Fatalf("expected fuzzy='fix login bug', got %q", q.Fuzzy)
	}
}

func TestParseCommitQuery_Combined(t *testing.T) {
	q, err := ParseCommitQuery(
		"until branch(main) author(robin) after(3 days ago) path(src/*.go) order-by-date ~login~ message(fix)",
	)
	if err != nil {
		t.Fatal(err)
	}
	if len(q.Revisions) != 1 || q.Revisions[0].Value != "main" {
		t.Fatalf("revision mismatch: %+v", q.Revisions)
	}
	if len(q.Authors) != 1 || q.Authors[0] != "robin" {
		t.Fatalf("authors mismatch: %v", q.Authors)
	}
	if q.After != "3 days ago" {
		t.Fatalf("after mismatch: %q", q.After)
	}
	if len(q.Paths) != 1 || q.Paths[0] != "src/*.go" {
		t.Fatalf("paths mismatch: %v", q.Paths)
	}
	if q.Order != OrderDate {
		t.Fatalf("order mismatch: %q", q.Order)
	}
	if q.Fuzzy != "login" {
		t.Fatalf("fuzzy mismatch: %q", q.Fuzzy)
	}
	if len(q.Messages) != 1 || q.Messages[0] != "fix" {
		t.Fatalf("messages mismatch: %v", q.Messages)
	}
}

func TestParseCommitQuery_IsEmpty(t *testing.T) {
	tests := []struct {
		query string
		empty bool
	}{
		{"", true},
		{"   ", true},
		{"until branch(main)", false},
		{"default-branch", false},
		{"author(robin)", false},
		{"order-by-date", false},
	}
	for _, tc := range tests {
		q, err := ParseCommitQuery(tc.query)
		if err != nil {
			t.Fatalf("%q: %v", tc.query, err)
		}
		if got := q.IsEmpty(); got != tc.empty {
			t.Fatalf("%q: IsEmpty()=%v, want %v", tc.query, got, tc.empty)
		}
	}
}

// ---------------------------------------------------------------------------
// matchCommitQueryGlob tests
// ---------------------------------------------------------------------------

func TestMatchCommitQueryGlob_PlainSubstring(t *testing.T) {
	if !matchCommitQueryGlob("hello", "hello world") {
		t.Fatal("expected true for substring match")
	}
	if matchCommitQueryGlob("xyz", "hello world") {
		t.Fatal("expected false for non-matching substring")
	}
}

func TestMatchCommitQueryGlob_StarWildcard(t *testing.T) {
	if !matchCommitQueryGlob("*.go", "main.go") {
		t.Fatal("expected *.go to match main.go")
	}
	if !matchCommitQueryGlob("src/*", "src/main.go") {
		t.Fatal("expected src/* to match src/main.go")
	}
	if matchCommitQueryGlob("*.go", "main.rs") {
		t.Fatal("expected *.go not to match main.rs")
	}
}

func TestMatchCommitQueryGlob_QuestionMark(t *testing.T) {
	if !matchCommitQueryGlob("main.?o", "main.go") {
		t.Fatal("expected main.?o to match main.go")
	}
	if matchCommitQueryGlob("main.?o", "main.goo") {
		t.Fatal("expected main.?o not to match main.goo")
	}
}

// ---------------------------------------------------------------------------
// parseRelaxedDate tests
// ---------------------------------------------------------------------------

func TestParseRelaxedDate_ISO(t *testing.T) {
	d, err := parseRelaxedDate("2024-01-15")
	if err != nil {
		t.Fatal(err)
	}
	if d.Year() != 2024 || d.Month() != 1 || d.Day() != 15 {
		t.Fatalf("unexpected date: %v", d)
	}
}

func TestParseRelaxedDate_Yesterday(t *testing.T) {
	d, err := parseRelaxedDate("yesterday")
	if err != nil {
		t.Fatal(err)
	}
	expected := time.Now().AddDate(0, 0, -1)
	if d.Year() != expected.Year() || d.Month() != expected.Month() || d.Day() != expected.Day() {
		t.Fatalf("expected %v, got %v", expected, d)
	}
}

func TestParseRelaxedDate_NDaysAgo(t *testing.T) {
	d, err := parseRelaxedDate("3 days ago")
	if err != nil {
		t.Fatal(err)
	}
	expected := time.Now().AddDate(0, 0, -3)
	if d.Year() != expected.Year() || d.Month() != expected.Month() || d.Day() != expected.Day() {
		t.Fatalf("expected %v, got %v", expected, d)
	}
}

func TestParseRelaxedDate_NHoursAgo(t *testing.T) {
	d, err := parseRelaxedDate("2 hours ago")
	if err != nil {
		t.Fatal(err)
	}
	expected := time.Now().Add(-2 * time.Hour)
	diff := d.Sub(expected)
	if diff < -time.Minute || diff > time.Minute {
		t.Fatalf("expected ~%v, got %v (diff=%v)", expected, d, diff)
	}
}

func TestParseRelaxedDate_Invalid(t *testing.T) {
	_, err := parseRelaxedDate("not a date")
	if err == nil {
		t.Fatal("expected error for invalid date")
	}
}

// ---------------------------------------------------------------------------
// Query filtering with real git repo
// ---------------------------------------------------------------------------

func TestListCommitsQuery_BasicFilter(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}

	// Push initial commits into the bare repo via a non-bare clone.
	workDir := filepath.Join(dir, "work")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGit(t, workDir, "init")
	runGit(t, workDir, "config", "user.email", "alice@example.com")
	runGit(t, workDir, "config", "user.name", "Alice")
	writeFile(t, workDir, "README.md", "# test\n")
	runGit(t, workDir, "add", "README.md")
	runGit(t, workDir, "commit", "-m", "initial commit")
	runGit(t, workDir, "remote", "add", "origin", gitDir)
	runGit(t, workDir, "push", "origin", "master")

	// Add another commit by a different author.
	writeFile(t, workDir, "src/main.go", "package main\n")
	runGit(t, workDir, "add", "src/main.go")
	runGit(t, workDir, "-c", "user.name=Bob", "-c", "user.email=bob@example.com",
		"commit", "-m", "add main.go")
	runGit(t, workDir, "push", "origin", "master")

	// Now query commits authored by Bob.
	query, _ := ParseCommitQuery("author(Bob)")
	commits, err := repo.ListCommitsQuery("master", query, 10, "", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit by Bob, got %d", len(commits))
	}
	if commits[0].Author.Name != "Bob" {
		t.Fatalf("expected author Bob, got %q", commits[0].Author.Name)
	}
}

func TestListCommitsQuery_PathFilter(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}

	workDir := filepath.Join(dir, "work")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGit(t, workDir, "init")
	runGit(t, workDir, "config", "user.email", "alice@example.com")
	runGit(t, workDir, "config", "user.name", "Alice")
	runGit(t, workDir, "remote", "add", "origin", gitDir)

	writeFile(t, workDir, "README.md", "# test\n")
	runGit(t, workDir, "add", "README.md")
	runGit(t, workDir, "commit", "-m", "add readme")
	runGit(t, workDir, "push", "origin", "master")

	writeFile(t, workDir, "src/main.go", "package main\n")
	runGit(t, workDir, "add", "src/main.go")
	runGit(t, workDir, "commit", "-m", "add go file")
	runGit(t, workDir, "push", "origin", "master")

	writeFile(t, workDir, "src/util.go", "package main\n")
	runGit(t, workDir, "add", "src/util.go")
	runGit(t, workDir, "commit", "-m", "add util")
	runGit(t, workDir, "push", "origin", "master")

	// Query: path filtering for src/ directory.
	query, _ := ParseCommitQuery("path(src)")
	commits, err := repo.ListCommitsQuery("master", query, 10, "", "")
	if err != nil {
		t.Fatal(err)
	}
	// We expect exactly 2 commits that touched src/.
	if len(commits) != 2 {
		t.Fatalf("expected 2 commits touching src/, got %d", len(commits))
	}
}

func TestListCommitsQuery_MessageFilter(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}

	workDir := filepath.Join(dir, "work")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGit(t, workDir, "init")
	runGit(t, workDir, "config", "user.email", "alice@example.com")
	runGit(t, workDir, "config", "user.name", "Alice")
	runGit(t, workDir, "remote", "add", "origin", gitDir)

	writeFile(t, workDir, "a.txt", "a\n")
	runGit(t, workDir, "add", "a.txt")
	runGit(t, workDir, "commit", "-m", "fix: login bug")
	runGit(t, workDir, "push", "origin", "master")

	writeFile(t, workDir, "b.txt", "b\n")
	runGit(t, workDir, "add", "b.txt")
	runGit(t, workDir, "commit", "-m", "add feature")
	runGit(t, workDir, "push", "origin", "master")

	// Query: message contains "login"
	query, _ := ParseCommitQuery("message(login)")
	commits, err := repo.ListCommitsQuery("master", query, 10, "", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit with login in message, got %d", len(commits))
	}
	if !strings.Contains(commits[0].Subject, "login") {
		t.Fatalf("expected subject to contain 'login', got %q", commits[0].Subject)
	}
}

func TestListCommitsQuery_FuzzyFilter(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}

	workDir := filepath.Join(dir, "work")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGit(t, workDir, "init")
	runGit(t, workDir, "config", "user.email", "alice@example.com")
	runGit(t, workDir, "config", "user.name", "Alice")
	runGit(t, workDir, "remote", "add", "origin", gitDir)

	writeFile(t, workDir, "a.txt", "a\n")
	runGit(t, workDir, "add", "a.txt")
	runGit(t, workDir, "commit", "-m", "implement authentication")
	runGit(t, workDir, "push", "origin", "master")

	writeFile(t, workDir, "b.txt", "b\n")
	runGit(t, workDir, "add", "b.txt")
	runGit(t, workDir, "commit", "-m", "fix typo")
	runGit(t, workDir, "push", "origin", "master")

	// Fuzzy search for "auth"
	query, _ := ParseCommitQuery("~auth~")
	commits, err := repo.ListCommitsQuery("master", query, 10, "", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit matching ~auth~, got %d", len(commits))
	}
}

func TestListCommitsQuery_NilQuery(t *testing.T) {
	dir := t.TempDir()
	gitDir := filepath.Join(dir, "git")
	if err := InitBare(gitDir); err != nil {
		t.Fatal(err)
	}
	repo, err := Open(gitDir)
	if err != nil {
		t.Fatal(err)
	}

	workDir := filepath.Join(dir, "work")
	if err := os.MkdirAll(workDir, 0o755); err != nil {
		t.Fatal(err)
	}
	runGit(t, workDir, "init")
	runGit(t, workDir, "config", "user.email", "alice@example.com")
	runGit(t, workDir, "config", "user.name", "Alice")
	runGit(t, workDir, "remote", "add", "origin", gitDir)

	writeFile(t, workDir, "a.txt", "a\n")
	runGit(t, workDir, "add", "a.txt")
	runGit(t, workDir, "commit", "-m", "test")
	runGit(t, workDir, "push", "origin", "master")

	// Nil query should behave like ListCommits.
	commits, err := repo.ListCommitsQuery("master", nil, 10, "", "")
	if err != nil {
		t.Fatal(err)
	}
	if len(commits) != 1 {
		t.Fatalf("expected 1 commit with nil query, got %d", len(commits))
	}
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

func runGit(t *testing.T, dir string, args ...string) {
	t.Helper()
	cmd := exec.Command("git", args...)
	cmd.Dir = dir
	if out, err := cmd.CombinedOutput(); err != nil {
		t.Fatalf("git %v: %s\n%s", args, err, out)
	}
}

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	p := filepath.Join(dir, name)
	if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(p, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
