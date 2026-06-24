package sqlite_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func TestOpenAndClose(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatalf("sqlite.Open: %v", err)
	}
	if store == nil {
		t.Fatal("expected non-nil store")
	}
	if store.DB() == nil {
		t.Fatal("expected non-nil DB")
	}
	if err := store.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
}

func TestMigrate(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	if err := store.Migrate(context.Background()); err != nil {
		t.Fatalf("Migrate: %v", err)
	}

	// Check that a key table exists.
	var count int
	if err := store.DB().QueryRowContext(context.Background(), "SELECT COUNT(*) FROM o_User").Scan(&count); err != nil {
		t.Fatalf("table o_User not found after migration: %v", err)
	}
}

func TestMigrate_idempotent(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ctx := context.Background()
	if err := store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	// Second migration should not error.
	if err := store.Migrate(ctx); err != nil {
		t.Fatalf("second Migrate: %v", err)
	}
}

func TestBootstrap(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer store.Close()

	ctx := context.Background()
	if err := store.Migrate(ctx); err != nil {
		t.Fatal(err)
	}
	if err := store.Bootstrap(ctx); err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}

	// Verify system users exist.
	var systemCount int
	if err := store.DB().QueryRowContext(ctx, "SELECT COUNT(*) FROM o_User WHERE o_id = -1").Scan(&systemCount); err != nil {
		t.Fatal(err)
	}
	if systemCount == 0 {
		t.Error("system user not found after bootstrap")
	}
}

func TestOpen_createsDBFile(t *testing.T) {
	dir := t.TempDir()
	store, err := sqlite.Open(dir)
	if err != nil {
		t.Fatal(err)
	}

	// Verify the store is usable by running a simple query.
	var result int
	if err := store.DB().QueryRowContext(context.Background(), "SELECT 1").Scan(&result); err != nil {
		t.Fatalf("query failed: %v", err)
	}
	store.Close()
}
