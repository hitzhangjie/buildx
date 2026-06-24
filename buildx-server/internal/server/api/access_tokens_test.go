package api_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil/mock"
)

func newAccessTokensHandler(sec *mock.SecurityService) *api.AccessTokensHandler {
	return &api.AccessTokensHandler{Security: sec}
}

func makeTestToken(id int64, ownerID int64, name string) *model.AccessToken {
	return &model.AccessToken{
		ID:      id,
		Name:    name,
		OwnerID: ownerID,
	}
}

func TestAccessTokensHandlerList_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		ListAccessTokensFunc: func(ctx context.Context, ownerID int64) ([]*model.AccessToken, error) {
			return []*model.AccessToken{
				{ID: 1, Name: "token-a", OwnerID: 1},
				{ID: 2, Name: "token-b", OwnerID: 1},
			}, nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens", nil)
	r.SetBasicAuth("testuser", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var tokens []model.AccessToken
	if err := json.Unmarshal(w.Body.Bytes(), &tokens); err != nil {
		t.Fatal(err)
	}
	if len(tokens) != 2 {
		t.Errorf("got %d tokens, want 2", len(tokens))
	}
}

func TestAccessTokensHandlerList_unauthorized(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens", nil)

	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestAccessTokensHandlerCreate_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenByOwnerAndNameFunc: func(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
			return nil, nil
		},
		CreateAccessTokenFunc: func(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
			return &model.AccessToken{
				ID:      1,
				Name:    name,
				OwnerID: ownerID,
				Value:   "generated-secret-value",
			}, nil
		},
	}
	h := newAccessTokensHandler(sec)
	body := strings.NewReader(`{"name":"my-new-token"}`)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/access-tokens", body)
	r.SetBasicAuth("testuser", "pass")

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", w.Code)
	}
	var tok model.AccessToken
	if err := json.Unmarshal(w.Body.Bytes(), &tok); err != nil {
		t.Fatal(err)
	}
	if tok.Value != "generated-secret-value" {
		t.Errorf("Value = %q, want generated-secret-value", tok.Value)
	}
	if tok.Name != "my-new-token" {
		t.Errorf("Name = %q", tok.Name)
	}
}

func TestAccessTokensHandlerCreate_emptyName(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}
	h := newAccessTokensHandler(sec)
	body := strings.NewReader(`{"name":""}`)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/access-tokens", body)
	r.SetBasicAuth("testuser", "pass")

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestAccessTokensHandlerCreate_duplicateName(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenByOwnerAndNameFunc: func(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
			return &model.AccessToken{ID: 5, Name: name, OwnerID: ownerID}, nil
		},
	}
	h := newAccessTokensHandler(sec)
	body := strings.NewReader(`{"name":"duplicate"}`)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/access-tokens", body)
	r.SetBasicAuth("testuser", "pass")

	h.Create(w, r)

	if w.Code != http.StatusConflict {
		t.Errorf("status = %d, want 409", w.Code)
	}
}

func TestAccessTokensHandlerCreate_unauthorized(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/access-tokens", strings.NewReader(`{"name":"x"}`))

	h.Create(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestAccessTokensHandlerGet_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return makeTestToken(1, 1, "my-token"), nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens/1", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Get(w, r, 1)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var tok model.AccessToken
	if err := json.Unmarshal(w.Body.Bytes(), &tok); err != nil {
		t.Fatal(err)
	}
	if tok.Name != "my-token" {
		t.Errorf("Name = %q", tok.Name)
	}
}

func TestAccessTokensHandlerGet_notFound(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return nil, nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens/999", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Get(w, r, 999)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestAccessTokensHandlerGet_notOwner(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(5), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return makeTestToken(1, 9, "other-user-token"), nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens/1", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Get(w, r, 1)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

func TestAccessTokensHandlerDelete_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return makeTestToken(1, 1, "my-token"), nil
		},
		DeleteAccessTokenFunc: func(ctx context.Context, id int64) error {
			return nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/~api/access-tokens/1", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Delete(w, r, 1)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", w.Code)
	}
}

func TestAccessTokensHandlerDelete_notOwner(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(5), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return makeTestToken(1, 9, "other-user-token"), nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodDelete, "/~api/access-tokens/1", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Delete(w, r, 1)

	if w.Code != http.StatusForbidden {
		t.Errorf("status = %d, want 403", w.Code)
	}
}

func TestAccessTokensHandlerDelete_notFound(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		FindAccessTokenFunc: func(ctx context.Context, id int64) (*model.AccessToken, error) {
			return nil, nil
		},
	}
	h := newAccessTokensHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/access-tokens/999", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Delete(w, r, 999)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}
