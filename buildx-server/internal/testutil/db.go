package testutil

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// OpenTestDB opens a bootstrapped SQLite store in a temp directory, runs
// migrations and bootstrap, and returns the store, project store, and
// security store. The temp directory is cleaned up when the test ends.
func OpenTestDB(tb testing.TB) (*sqlite.Store, *project.DBStore, *security.DBStore) {
	tb.Helper()
	dir := tb.TempDir()

	store, err := sqlite.Open(dir)
	if err != nil {
		tb.Fatalf("sqlite.Open: %v", err)
	}

	ctx := context.Background()
	if err := store.Migrate(ctx); err != nil {
		store.Close()
		tb.Fatalf("store.Migrate: %v", err)
	}
	if err := store.Bootstrap(ctx); err != nil {
		store.Close()
		tb.Fatalf("store.Bootstrap: %v", err)
	}

	projStore := project.NewDBStore(store.DB(), dir)
	secStore := security.NewDBStore(store.DB())

	tb.Cleanup(func() {
		store.Close()
	})

	return store, projStore, secStore
}
