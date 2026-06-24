package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/invitation"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil/mock"
)

type invitationListView struct {
	ID           int64  `json:"id"`
	EmailAddress string `json:"emailAddress"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt"`
}

func newInvitationsHandler(sec *mock.SecurityService, store *invitation.DBStore) *api.InvitationsHandler {
	return &api.InvitationsHandler{Invitations: store, Security: sec}
}

func setupInvitationStore(t *testing.T) *invitation.DBStore {
	t.Helper()
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}
	return invitation.NewDBStore(store.DB())
}

func TestInvitationsHandlerList_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{ID: model.UserRootID, Name: "admin"}, nil
		},
	}
	invStore := setupInvitationStore(t)
	ctx := context.Background()
	if _, err := invStore.Create(ctx, &model.Invitation{EmailAddress: "invitee@example.com"}); err != nil {
		t.Fatal(err)
	}

	h := newInvitationsHandler(sec, invStore)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/invitations", nil)
	r.SetBasicAuth("admin", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	var views []invitationListView
	if err := json.Unmarshal(w.Body.Bytes(), &views); err != nil {
		t.Fatal(err)
	}
	if len(views) != 1 {
		t.Fatalf("got %d invitations, want 1", len(views))
	}
	if views[0].EmailAddress != "invitee@example.com" {
		t.Fatalf("email = %q", views[0].EmailAddress)
	}
	if views[0].Status != "pending" {
		t.Fatalf("status = %q", views[0].Status)
	}
}

func TestInvitationsHandlerList_forbidden(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(2), nil
		},
	}
	h := newInvitationsHandler(sec, setupInvitationStore(t))
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/invitations", nil)
	r.SetBasicAuth("user", "pass")

	h.List(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

func TestInvitationsHandlerCreate_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{ID: model.UserRootID, Name: "admin"}, nil
		},
	}
	invStore := setupInvitationStore(t)
	h := newInvitationsHandler(sec, invStore)

	reqBody := `{"emailAddresses":["one@example.com","two@example.com"],"role":"viewer"}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/invitations", strings.NewReader(reqBody))
	r.SetBasicAuth("admin", "pass")

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
	var resp map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response body: %v", err)
	}
	if resp["status"] != "ok" {
		t.Fatalf("status field = %q", resp["status"])
	}
	list, err := invStore.List(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("len = %d", len(list))
	}
}

func TestInvitationsHandlerCreate_duplicateEmail(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{ID: model.UserRootID, Name: "admin"}, nil
		},
	}
	invStore := setupInvitationStore(t)
	ctx := context.Background()
	if _, err := invStore.Create(ctx, &model.Invitation{EmailAddress: "dup@example.com"}); err != nil {
		t.Fatal(err)
	}
	h := newInvitationsHandler(sec, invStore)

	body := `{"emailAddresses":["dup@example.com"]}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/invitations", strings.NewReader(body))
	r.SetBasicAuth("admin", "pass")

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", w.Code)
	}
}

func TestInvitationsHandlerDelete_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{ID: model.UserRootID, Name: "admin"}, nil
		},
	}
	invStore := setupInvitationStore(t)
	created, err := invStore.Create(context.Background(), &model.Invitation{EmailAddress: "delete-me@example.com"})
	if err != nil {
		t.Fatal(err)
	}
	h := newInvitationsHandler(sec, invStore)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/~api/invitations/1", nil)
	r.SetBasicAuth("admin", "pass")

	h.Delete(w, r, created.ID)

	if w.Code != http.StatusNoContent {
		t.Fatalf("status = %d", w.Code)
	}
}

func TestInvitationsHandlerResend_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return &model.User{ID: model.UserRootID, Name: "admin"}, nil
		},
	}
	invStore := setupInvitationStore(t)
	created, err := invStore.Create(context.Background(), &model.Invitation{EmailAddress: "resend@example.com"})
	if err != nil {
		t.Fatal(err)
	}
	before := created.InvitationCode
	h := newInvitationsHandler(sec, invStore)

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/invitations/1/resend", nil)
	r.SetBasicAuth("admin", "pass")

	h.Resend(w, r, created.ID)

	if w.Code != http.StatusNoContent {
		t.Fatalf("status = %d", w.Code)
	}
	got, err := invStore.FindByID(context.Background(), created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.InvitationCode == before {
		t.Fatal("expected invitation code to change after resend")
	}
}
