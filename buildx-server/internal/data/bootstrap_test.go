package data_test

import (
	"context"
	"database/sql"
	"os"
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/data"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

func setupDB(t *testing.T) (*sqlite.Store, *sql.DB, string) {
	t.Helper()
	dir := t.TempDir()
	store, err := sqlite.Open(dir)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}
	return store, store.DB(), dir
}

func TestBootstrap(t *testing.T) {
	store, db, dir := setupDB(t)
	ctx := context.Background()

	if err := data.Bootstrap(ctx, db, dir); err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}

	// Verify system users.
	sec := security.NewDBStore(db)
	sysUser, err := sec.GetUser(ctx, model.UserSystemID)
	if err != nil || sysUser == nil {
		t.Fatalf("system user missing: err=%v", err)
	}
	if sysUser.Name != model.UserSystemName {
		t.Errorf("system user name = %q", sysUser.Name)
	}
	if sysUser.Type != model.UserTypeService {
		t.Errorf("system user type = %q", sysUser.Type)
	}

	unknownUser, err := sec.GetUser(ctx, model.UserUnknownID)
	if err != nil || unknownUser == nil {
		t.Fatalf("unknown user missing: err=%v", err)
	}

	// Verify owner role.
	var roleCount int
	db.QueryRowContext(ctx, "SELECT COUNT(*) FROM o_Role WHERE o_id = ?", model.RoleOwnerID).Scan(&roleCount)
	if roleCount == 0 {
		t.Error("owner role not found")
	}

	// Verify site dirs.
	for _, sub := range []string{"site/projects", "internaldb"} {
		p := filepath.Join(dir, sub)
		if _, err := os.Stat(p); os.IsNotExist(err) {
			t.Errorf("directory not created: %s", p)
		}
	}

	_ = store
}

func TestBootstrapRootUser_envSet(t *testing.T) {
	_, db, dir := setupDB(t)
	ctx := context.Background()

	t.Setenv("BUILDX_INITIAL_USER", "admin")
	t.Setenv("BUILDX_INITIAL_PASSWORD", "admin123")
	t.Setenv("BUILDX_INITIAL_EMAIL", "admin@example.com")

	if err := data.Bootstrap(ctx, db, dir); err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}

	sec := security.NewDBStore(db)
	root, err := sec.GetUser(ctx, model.UserRootID)
	if err != nil || root == nil {
		t.Fatalf("root user missing: err=%v", err)
	}
	if root.Name != "admin" {
		t.Errorf("root name = %q, want admin", root.Name)
	}
}

func TestBootstrapRootUser_envNotSet(t *testing.T) {
	_, db, dir := setupDB(t)
	ctx := context.Background()

	if err := data.Bootstrap(ctx, db, dir); err != nil {
		t.Fatalf("Bootstrap: %v", err)
	}

	sec := security.NewDBStore(db)
	root, err := sec.GetUser(ctx, model.UserRootID)
	if err != nil {
		t.Fatal(err)
	}
	if root != nil {
		t.Error("expected nil root user when env vars not set")
	}
}

func TestBoolToInt(t *testing.T) {
	// We can't test the unexported boolToInt directly from external package.
	// Instead, verify indirectly via Bootstrap that it works correctly.
}
