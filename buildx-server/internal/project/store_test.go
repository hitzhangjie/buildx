package project_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/data"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
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

func TestProjectGetAndList(t *testing.T) {
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
	user, _ := sec.CreateUser(ctx, "alice", "Alice", "alice@example.com", "secret123")
	projects := project.NewDBStore(store.DB(), dir)

	p, _ := projects.Create(ctx, user.ID, &project.Project{Name: "demo"})

	// Get by ID.
	got, err := projects.Get(ctx, p.ID)
	if err != nil || got == nil {
		t.Fatalf("Get: err=%v got=%v", err, got)
	}
	if got.Path != "demo" {
		t.Errorf("path = %q", got.Path)
	}

	// Get by path.
	got, err = projects.GetByPath(ctx, "demo")
	if err != nil || got == nil {
		t.Fatalf("GetByPath: err=%v got=%v", err, got)
	}

	// Get non-existing.
	got, err = projects.Get(ctx, 99999)
	if err != nil || got != nil {
		t.Errorf("expected nil for nonexistent ID: err=%v got=%v", err, got)
	}

	// List.
	list, err := projects.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) < 1 {
		t.Error("expected at least one project in list")
	}
}

func TestProjectSetup(t *testing.T) {
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
	user, _ := sec.CreateUser(ctx, "alice", "Alice", "alice@example.com", "secret123")
	projects := project.NewDBStore(store.DB(), dir)

	// Setup creates nested projects.
	p, err := projects.Setup(ctx, user.ID, "parent/child")
	if err != nil {
		t.Fatal(err)
	}
	if p == nil {
		t.Fatal("expected project from Setup")
	}

	// Verify parent and child exist.
	parent, err := projects.GetByPath(ctx, "parent")
	if err != nil || parent == nil {
		t.Fatalf("parent project: err=%v", err)
	}
	child, err := projects.GetByPath(ctx, "parent/child")
	if err != nil || child == nil {
		t.Fatalf("child project: err=%v", err)
	}
	if child.ParentID == nil || *child.ParentID != parent.ID {
		t.Error("child.ParentID should reference parent")
	}
}

func TestProjectCreate_differentOwners(t *testing.T) {
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
	alice, _ := sec.CreateUser(ctx, "alice", "Alice", "alice@example.com", "secret123")
	bob, _ := sec.CreateUser(ctx, "bob", "Bob", "bob@example.com", "secret456")
	projects := project.NewDBStore(store.DB(), dir)

	// Alice creates a project — she owns it.
	p, err := projects.Create(ctx, alice.ID, &project.Project{Name: "alice-project"})
	if err != nil {
		t.Fatal(err)
	}
	if p == nil {
		t.Fatal("expected project")
	}
	ok, _ := sec.IsProjectOwner(ctx, alice.ID, p.ID)
	if !ok {
		t.Error("alice should own her project")
	}
	// Bob creates his own project.
	p2, err := projects.Create(ctx, bob.ID, &project.Project{Name: "bob-project"})
	if err != nil {
		t.Fatal(err)
	}
	ok, _ = sec.IsProjectOwner(ctx, bob.ID, p2.ID)
	if !ok {
		t.Error("bob should own his project")
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
