package issuesetting

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func TestGetDefaultWhenMissing(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}

	s := NewDBStore(store.DB())
	setting, err := s.Get(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(setting.StateSpecs) != 4 {
		t.Fatalf("states = %d", len(setting.StateSpecs))
	}
	if setting.DefaultBoard().Name != "State" {
		t.Fatalf("board = %q", setting.DefaultBoard().Name)
	}
}

func TestSaveAndLoad(t *testing.T) {
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}

	s := NewDBStore(store.DB())
	ctx := context.Background()
	custom := Default()
	custom.StateSpecs = append(custom.StateSpecs, StateSpec{Name: "Done", Color: "#000"})
	if err := s.Save(ctx, custom); err != nil {
		t.Fatal(err)
	}
	got, err := s.Get(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(got.StateSpecs) != 5 {
		t.Fatalf("states = %d", len(got.StateSpecs))
	}
}
