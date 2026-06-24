package security_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func TestDBStoreCreateAndAuthenticate(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, err := sec.CreateUser(ctx, "alice", "Alice", "alice@example.com", "secret123")
	if err != nil {
		t.Fatal(err)
	}
	if user == nil {
		t.Fatal("expected non-nil user")
	}
	if user.Name != "alice" {
		t.Errorf("Name = %q", user.Name)
	}

	authUser, err := sec.Authenticate(ctx, "alice", "secret123")
	if err != nil {
		t.Fatalf("Authenticate: %v", err)
	}
	if authUser.ID != user.ID {
		t.Errorf("auth user ID = %d, want %d", authUser.ID, user.ID)
	}
}

func TestDBStoreAuthenticate_invalidPassword(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	sec.CreateUser(ctx, "bob", "Bob", "bob@example.com", "correct")

	_, err := sec.Authenticate(ctx, "bob", "wrong")
	if err == nil {
		t.Fatal("expected error for wrong password")
	}
}

func TestDBStoreAuthenticate_emptyCredentials(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	_, err := sec.Authenticate(ctx, "", "pass")
	if err == nil {
		t.Fatal("expected error for empty username")
	}
	_, err = sec.Authenticate(ctx, "user", "")
	if err == nil {
		t.Fatal("expected error for empty password")
	}
}

func TestDBStoreAuthenticate_tokenAuthentication(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "carol", "Carol", "carol@example.com", "secret")
	token, err := sec.CreateAccessToken(ctx, user.ID, "my-token")
	if err != nil {
		t.Fatal(err)
	}

	// Authenticate using token value as password
	authUser, err := sec.Authenticate(ctx, "carol", token.Value)
	if err != nil {
		t.Fatalf("token authenticate via password field: %v", err)
	}
	if authUser.ID != user.ID {
		t.Errorf("expected user %d, got %d", user.ID, authUser.ID)
	}
}

func TestDBStoreAuthenticateToken(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "dave", "Dave", "dave@example.com", "secret")
	token, _ := sec.CreateAccessToken(ctx, user.ID, "my-token")

	authUser, err := sec.AuthenticateToken(ctx, token.Value)
	if err != nil {
		t.Fatalf("AuthenticateToken: %v", err)
	}
	if authUser.ID != user.ID {
		t.Errorf("expected user %d, got %d", user.ID, authUser.ID)
	}
}

func TestDBStoreAuthenticateToken_empty(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	_, err := sec.AuthenticateToken(ctx, "")
	if err == nil {
		t.Fatal("expected error for empty token")
	}
}

func TestDBStoreAuthenticateToken_invalid(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, err := sec.AuthenticateToken(ctx, "nonexistent-token")
	if err != nil {
		t.Fatal(err)
	}
	if user != nil {
		t.Fatal("expected nil user for invalid token")
	}
}

func TestDBStoreListUsers(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	sec.CreateUser(ctx, "eve", "Eve", "eve@example.com", "secret")
	sec.CreateUser(ctx, "frank", "Frank", "frank@example.com", "secret")

	users, err := sec.ListUsers(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if len(users) < 2 {
		t.Errorf("expected at least 2 users, got %d", len(users))
	}
	for _, u := range users {
		if u.ID == model.UserSystemID || u.ID == model.UserUnknownID {
			t.Errorf("ListUsers should not include system users, got ID=%d", u.ID)
		}
	}
}

func TestDBStoreHasLoginUser(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	has, err := sec.HasLoginUser(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if has {
		t.Fatal("expected no login user before creating any")
	}

	sec.CreateUser(ctx, "grace", "Grace", "grace@example.com", "secret")

	has, err = sec.HasLoginUser(ctx)
	if err != nil {
		t.Fatal(err)
	}
	if !has {
		t.Fatal("expected login user after creating one")
	}
}

func TestDBStoreGetUser(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "heidi", "Heidi", "heidi@example.com", "secret")

	got, err := sec.GetUser(ctx, user.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got == nil {
		t.Fatal("expected user")
	}
	if got.Name != "heidi" {
		t.Errorf("name = %q", got.Name)
	}
}

func TestDBStoreGetUser_nonexistent(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	got, err := sec.GetUser(ctx, 99999)
	if err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Fatal("expected nil for nonexistent user")
	}
}

func TestDBStoreFindUserByName(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	sec.CreateUser(ctx, "ivan", "Ivan", "ivan@example.com", "secret")

	got, err := sec.FindUserByName(ctx, "ivan")
	if err != nil {
		t.Fatal(err)
	}
	if got == nil {
		t.Fatal("expected user")
	}
	if got.FullName != "Ivan" {
		t.Errorf("fullName = %q", got.FullName)
	}
}

func TestDBStoreFindUserByName_nonexistent(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	got, err := sec.FindUserByName(ctx, "no-such-user")
	if err != nil {
		t.Fatal(err)
	}
	if got != nil {
		t.Fatal("expected nil for nonexistent name")
	}
}

func TestDBStoreHasProjectAccess(t *testing.T) {
	_, proj, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "jack", "Jack", "jack@example.com", "secret")

	// Root always has access.
	ok, err := sec.HasProjectAccess(ctx, model.UserRootID, 999)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("root should always have access")
	}

	// User without authorization.
	ok, err = sec.HasProjectAccess(ctx, user.ID, 999)
	if err != nil {
		t.Fatal(err)
	}
	if ok {
		t.Fatal("user without authorization should not have access")
	}

	// Create a project which grants ownership to user.
	p, err := proj.Create(ctx, user.ID, &model.Project{Name: "testproj"})
	if err != nil {
		t.Fatal(err)
	}
	ok, err = sec.HasProjectAccess(ctx, user.ID, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("project owner should have access")
	}
}

func TestDBStoreIsProjectOwner(t *testing.T) {
	_, proj, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "karl", "Karl", "karl@example.com", "secret")

	// Root is always owner.
	ok, err := sec.IsProjectOwner(ctx, model.UserRootID, 999)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("root should always be owner")
	}

	p, _ := proj.Create(ctx, user.ID, &model.Project{Name: "myproj"})
	ok, err = sec.IsProjectOwner(ctx, user.ID, p.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !ok {
		t.Fatal("project creator should be owner")
	}
}

func TestDBStoreAuthorize(t *testing.T) {
	_, proj, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "lena", "Lena", "lena@example.com", "secret")
	p, _ := proj.Create(ctx, user.ID, &model.Project{Name: "authproj"})

	ok, err := sec.Authorize(ctx, user.ID, p.ID, "read")
	if err != nil || !ok {
		t.Fatalf("Authorize read: ok=%v err=%v", ok, err)
	}

	_, err = sec.Authorize(ctx, user.ID, p.ID, "unknown-action")
	if err == nil {
		t.Fatal("expected error for unknown action")
	}
}

func TestDBStoreCreateAccessToken(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "mike", "Mike", "mike@example.com", "secret")
	token, err := sec.CreateAccessToken(ctx, user.ID, "test-token")
	if err != nil {
		t.Fatal(err)
	}
	if token.Value == "" {
		t.Fatal("expected non-empty token value")
	}
	if token.OwnerID != user.ID {
		t.Errorf("OwnerID = %d, want %d", token.OwnerID, user.ID)
	}
}

func TestDBStoreFindAccessToken(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	user, _ := sec.CreateUser(ctx, "nina", "Nina", "nina@example.com", "secret")
	created, _ := sec.CreateAccessToken(ctx, user.ID, "test-token")

	found, err := sec.FindAccessTokenByValue(ctx, created.Value)
	if err != nil {
		t.Fatal(err)
	}
	if found == nil {
		t.Fatal("expected to find token")
	}
	if found.OwnerID != user.ID {
		t.Errorf("OwnerID = %d, want %d", found.OwnerID, user.ID)
	}
}

func TestDBStoreFindAccessToken_nonexistent(t *testing.T) {
	_, _, sec := testutil.OpenTestDB(t)
	ctx := context.Background()

	found, err := sec.FindAccessTokenByValue(ctx, "nonexistent-value")
	if err != nil {
		t.Fatal(err)
	}
	if found != nil {
		t.Fatal("expected nil for nonexistent token")
	}
}
