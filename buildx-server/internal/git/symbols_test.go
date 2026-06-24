package git_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestSearchSymbols_GoFunctions(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	content := "package main\n\nimport \"fmt\"\n\nfunc main() {\n\tfmt.Println(\"hello\")\n}\n\nfunc Greet(name string) string {\n\treturn \"hello \" + name\n}\n"
	testutil.CommitFile(t, workDir, "main.go", content, "add main")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	hits, _, err := repo.SearchSymbols(ctx, git.SymbolSearchOptions{
		Revision:   "main",
		Query:      "Greet",
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 {
		t.Fatalf("expected 1 hit, got %d", len(hits))
	}
	if hits[0].SymbolName != "Greet" {
		t.Fatalf("expected Greet, got %s", hits[0].SymbolName)
	}
	if hits[0].Namespace != "main" {
		t.Fatalf("expected namespace main, got %s", hits[0].Namespace)
	}
}

func TestSearchSymbols_Wildcard(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	content := "package lib\n\nfunc Alpha() {}\nfunc Beta() {}\n"
	testutil.CommitFile(t, workDir, "lib/util.go", content, "add util")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	hits, _, err := repo.SearchSymbols(ctx, git.SymbolSearchOptions{
		Revision:   "main",
		Query:      "*eta",
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 || hits[0].SymbolName != "Beta" {
		t.Fatalf("expected Beta hit, got %#v", hits)
	}
}

func TestSearchSymbols_FileNameFilter(t *testing.T) {
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "main.go", "package main\n\nfunc Foo() {}\n", "add go")
	testutil.CommitFile(t, workDir, "docs/notes.md", "# Foo\n", "add md")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/main")

	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	ctx := context.Background()
	hits, _, err := repo.SearchSymbols(ctx, git.SymbolSearchOptions{
		Revision:   "main",
		Query:      "Foo",
		FileNames:  "*.go",
		MaxResults: 100,
	})
	if err != nil {
		t.Fatal(err)
	}
	if len(hits) != 1 || hits[0].FilePath != "main.go" {
		t.Fatalf("expected single go hit, got %#v", hits)
	}
}

func TestSearchSymbols_TooGeneralQuery(t *testing.T) {
	bareDir, _, _ := testutil.SetupBareWithCommit(t)
	repo, err := git.Open(bareDir)
	if err != nil {
		t.Fatal(err)
	}

	_, _, err = repo.SearchSymbols(context.Background(), git.SymbolSearchOptions{
		Revision:   "main",
		Query:      "**",
		MaxResults: 100,
	})
	if err != git.ErrQueryTooGeneral {
		t.Fatalf("expected ErrQueryTooGeneral, got %v", err)
	}
}
