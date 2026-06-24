package git_test

import (
	"context"
	"fmt"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestSearchFiles_ExactMatch(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	// Add more files to the work repo and push.
	testutil.CommitFile(t, workDir, "src/main.go", "package main\n", "add main")
	testutil.CommitFile(t, workDir, "src/lib/util.go", "package lib\n", "add util")
	testutil.CommitFile(t, workDir, "docs/index.md", "# Docs\n", "add docs")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, hasMore, err := repo.SearchFiles(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "main.go",
		MaxResults: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 {
		t.Fatalf("expected 1 hit, got %d", len(hits))
	}
	if hits[0].FileName != "main.go" {
		t.Fatalf("expected main.go, got %s", hits[0].FileName)
	}
	if hits[0].FilePath != "src/main.go" {
		t.Fatalf("expected src/main.go, got %s", hits[0].FilePath)
	}
	if hasMore {
		t.Fatal("unexpected hasMore")
	}
}

func TestSearchFiles_CaseInsensitive(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "src/MainApp.go", "package main\n", "add MainApp")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchFiles(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "mainapp",
		MaxResults: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 {
		t.Fatalf("expected 1 hit for case-insensitive search, got %d", len(hits))
	}
}

func TestSearchFiles_Wildcard(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n", "add main")
	testutil.CommitFile(t, workDir, "main_test.go", "package main_test\n", "add test")
	testutil.CommitFile(t, workDir, "util.go", "package main\n", "add util")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchFiles(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "*.go",
		MaxResults: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) < 2 {
		t.Fatalf("expected at least 2 hits for *.go, got %d", len(hits))
	}
}

func TestSearchFiles_DirectoryRestriction(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "src/main.go", "package main\n", "add main")
	testutil.CommitFile(t, workDir, "src/lib/util.go", "package lib\n", "add util")
	testutil.CommitFile(t, workDir, "docs/index.md", "# Docs\n", "add docs")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchFiles(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      ".go",
		Directory:  "src",
		MaxResults: 15,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 2 {
		t.Fatalf("expected 2 hits in src/, got %d", len(hits))
	}
	for _, h := range hits {
		if !strings.HasPrefix(h.FilePath, "src/") {
			t.Fatalf("expected path under src/, got %s", h.FilePath)
		}
	}
}

func TestSearchFiles_MaxResults(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	for i := 0; i < 10; i++ {
		name := fmt.Sprintf("file_%d.go", i)
		testutil.CommitFile(t, workDir, name, "package main\n", "add "+name)
	}
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	max := 3
	hits, hasMore, err := repo.SearchFiles(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      ".go",
		MaxResults: max,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != max {
		t.Fatalf("expected %d hits, got %d", max, len(hits))
	}
	if !hasMore {
		t.Fatal("expected hasMore=true")
	}
}

func TestSearchText_Basic(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n\nfunc main() {\n\tprintln(\"hello world\")\n}\n", "add main")
	testutil.CommitFile(t, workDir, "util.go", "package main\n\nfunc greet() string {\n\treturn \"hello\"\n}\n", "add util")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchText(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "hello",
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) < 2 {
		t.Fatalf("expected at least 2 hits for 'hello', got %d", len(hits))
	}
}

func TestSearchText_CaseSensitive(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n\nfunc Main() {\n\tprintln(\"hello\")\n}\n", "add main")
	testutil.CommitFile(t, workDir, "util.go", "func main() {}\n", "add util")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchText(ctx, git.SearchOptions{
		Revision:      "main",
		Query:         "Main",
		CaseSensitive: true,
		MaxResults:    100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 {
		t.Fatalf("expected 1 hit for case-sensitive 'Main', got %d", len(hits))
	}
	if hits[0].FilePath != "main.go" {
		t.Fatalf("expected hit in main.go, got %s", hits[0].FilePath)
	}
}

func TestSearchText_WholeWord(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n\nfunc main() {\n\tprintln(\"hello\")\n}\n", "add main")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchText(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "main",
		WholeWord:  true,
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) == 0 {
		t.Fatal("expected at least 1 whole-word hit for 'main'")
	}
}

func TestSearchText_Regex(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n\nfunc main() {\n\tfmt.Println(\"hello world\")\n}\n", "add main")
	testutil.CommitFile(t, workDir, "util.go", "package main\n\nfunc greet() string {\n\treturn fmt.Sprintf(\"hi\")\n}\n", "add util")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()

	hits, _, err := repo.SearchText(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      `fmt\.(Print|Sprint)`,
		Regex:      true,
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) < 2 {
		t.Fatalf("expected at least 2 hits for regex, got %d", len(hits))
	}
}

func TestSearchText_NoResults(t *testing.T) {
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	hits, hasMore, err := repo.SearchText(ctx, git.SearchOptions{
		Revision:   "main",
		Query:      "nonexistent12345xyz",
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 0 {
		t.Fatalf("expected 0 hits, got %d", len(hits))
	}
	if hasMore {
		t.Fatal("unexpected hasMore")
	}
}
