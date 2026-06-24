package invitation

import (
	"context"
	"testing"

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
	return NewDBStore(store.DB())
}

func TestCreateListDelete(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	created, err := s.Create(ctx, &model.Invitation{EmailAddress: "alice@example.com", Role: "developer"})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == 0 {
		t.Fatal("expected id")
	}
	if created.InvitationCode == "" {
		t.Fatal("expected invitation code")
	}

	list, err := s.List(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}
	if list[0].EmailAddress != "alice@example.com" {
		t.Fatalf("email = %q", list[0].EmailAddress)
	}

	got, err := s.FindByEmail(ctx, "alice@example.com")
	if err != nil {
		t.Fatal(err)
	}
	if got == nil || got.ID != created.ID {
		t.Fatal("expected invitation by email")
	}

	refreshed, err := s.RefreshInvitationCode(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if refreshed.InvitationCode == created.InvitationCode {
		t.Fatal("expected refreshed invitation code")
	}

	if err := s.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(ctx, created.ID); err != ErrNotFound {
		t.Fatalf("delete again: %v", err)
	}
}

func TestEmailInUse(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	inUse, err := s.EmailInUse(ctx, "nobody@example.com")
	if err != nil {
		t.Fatal(err)
	}
	if inUse {
		t.Fatal("expected email not in use")
	}

	db := s.db
	if _, err := db.ExecContext(ctx, `
		INSERT INTO o_User (o_id, o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (1, 'alice', 'Alice', 'ORDINARY', 0, 'x')`); err != nil {
		t.Fatal(err)
	}
	if _, err := db.ExecContext(ctx, `
		INSERT INTO o_EmailAddress (o_value, o_owner_id, o_primary, o_git)
		VALUES ('alice@example.com', 1, 1, 1)`); err != nil {
		t.Fatal(err)
	}

	inUse, err = s.EmailInUse(ctx, "alice@example.com")
	if err != nil {
		t.Fatal(err)
	}
	if !inUse {
		t.Fatal("expected email in use")
	}
}

func TestCreateRejectsDuplicateEmail(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	if _, err := s.Create(ctx, &model.Invitation{EmailAddress: "bob@example.com"}); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(ctx, &model.Invitation{EmailAddress: "bob@example.com"}); err == nil {
		t.Fatal("expected duplicate email error")
	}
}
