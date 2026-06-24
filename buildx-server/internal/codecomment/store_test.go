package codecomment

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func setupStore(t *testing.T) *DBStore {
	t.Helper()
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_User (o_id, o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (1, 'admin', 'Admin', 'ORDINARY', 0, 'x')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_ProjectLastActivityDate (o_id, o_value) VALUES (1, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_Project (o_id, o_name, o_path, o_pathLen, o_lastActivityDate_id, o_createDate)
		VALUES (1, 'demo', 'demo', 1, 1, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	return NewDBStore(store.DB())
}

func TestCreateAndListByMark(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	created, err := s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "Looks good",
		Mark: model.Mark{
			CommitHash: "abc123",
			Path:       ".gitignore",
			Range:      &model.PlanarRange{FromRow: 3, FromColumn: 0, ToRow: 8, ToColumn: 12},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == 0 {
		t.Fatal("expected id")
	}

	got, err := s.Get(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Content != "Looks good" {
		t.Fatalf("content = %q", got.Content)
	}

	list, err := s.ListByMark(ctx, 1, "abc123", ".gitignore")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}
}

func TestGetNotFound(t *testing.T) {
	s := setupStore(t)
	_, err := s.Get(context.Background(), 999)
	if err != ErrNotFound {
		t.Fatalf("err = %v", err)
	}
}

func TestDelete(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()
	created, err := s.Create(ctx, &model.CodeComment{
		ProjectID:  1,
		User:       &model.User{ID: 1},
		Content:    "delete me",
		CreateDate: time.Now().UTC(),
		Mark: model.Mark{
			CommitHash: "abc",
			Path:       "a.go",
			Range:      &model.PlanarRange{FromRow: 0, FromColumn: 0, ToRow: 0, ToColumn: 1},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	_, err = s.Get(ctx, created.ID)
	if err != ErrNotFound {
		t.Fatalf("err = %v", err)
	}
}

func TestCreateValidation(t *testing.T) {
	s := setupStore(t)
	_, err := s.Create(context.Background(), &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "",
		Mark: model.Mark{
			CommitHash: "abc",
			Path:       "a.go",
			Range:      &model.PlanarRange{},
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

var _ = sql.ErrNoRows
