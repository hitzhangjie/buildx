package project_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/data"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func TestProjectCreateAndAuth(t *testing.T) {
	dir := t.TempDir()
	store, err := sqlite.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ctx := context.Background()
	if err := store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	if err := data.Bootstrap(ctx, store.DB(), dir); err != nil {
		t.Fatal(err)
	}

	sec := security.NewDBStore(store.DB())
	user, err := sec.CreateUser(ctx, "alice", "Alice", "alice@example.com", "secret123")
	if err != nil {
		t.Fatal(err)
	}

	projects := project.NewDBStore(store.DB(), dir)
	p, err := projects.Create(ctx, user.ID, &project.Project{Name: "demo", Key: "DEMO"})
	if err != nil {
		t.Fatal(err)
	}
	if p.Path != "demo" {
		t.Fatalf("path = %q, want demo", p.Path)
	}

	gitDir := projects.GitDir(p.ID)
	if _, err := os.Stat(filepath.Join(gitDir, "HEAD")); err != nil {
		t.Fatalf("bare git repo not initialized: %v", gitDir)
	}

	authUser, err := sec.Authenticate(ctx, "alice", "secret123")
	if err != nil {
		t.Fatal(err)
	}
	if authUser.ID != user.ID {
		t.Fatalf("auth user id = %d, want %d", authUser.ID, user.ID)
	}

	ok, err := sec.HasProjectAccess(ctx, user.ID, p.ID)
	if err != nil || !ok {
		t.Fatalf("expected project access, ok=%v err=%v", ok, err)
	}

	// Root user shortcut
	ok, err = sec.HasProjectAccess(ctx, model.UserRootID, p.ID)
	if err != nil || !ok {
		t.Fatalf("root should have access")
	}
}

func TestBootstrapSystemUsers(t *testing.T) {
	dir := t.TempDir()
	db, err := sql.Open("sqlite", filepath.Join(dir, "test.db"))
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()

	ctx := context.Background()
	store, err := sqlite.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()
	if err := store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	if err := data.Bootstrap(ctx, store.DB(), dir); err != nil {
		t.Fatal(err)
	}

	sec := security.NewDBStore(store.DB())
	system, err := sec.GetUser(ctx, model.UserSystemID)
	if err != nil || system == nil {
		t.Fatalf("system user missing: %v", err)
	}
}
