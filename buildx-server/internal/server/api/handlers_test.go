package api_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil/mock"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func makeTestUser(id int64) *model.User {
	return &model.User{
		ID:       id,
		Name:     "testuser",
		FullName: "Test User",
		Type:     model.UserTypeOrdinary,
	}
}

func makeTestProject(id int64, name string) *model.Project {
	return &model.Project{
		ID:   id,
		Name: name,
		Path: name,
	}
}

func newProjectsHandler(proj *mock.ProjectService, sec *mock.SecurityService) *api.ProjectsHandler {
	return &api.ProjectsHandler{Projects: proj, Security: sec}
}

func newUsersHandler(sec *mock.SecurityService) *api.UsersHandler {
	return &api.UsersHandler{Security: sec}
}

// ---------- ProjectsHandler tests ----------

func TestProjectsHandlerList_success(t *testing.T) {
	proj := &mock.ProjectService{
		ListFunc: func(ctx context.Context) ([]*model.Project, error) {
			return []*model.Project{{ID: 1, Name: "demo", Path: "demo"}}, nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects", nil)
	r.SetBasicAuth("testuser", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestProjectsHandlerList_unauthorized(t *testing.T) {
	proj := &mock.ProjectService{}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, security.ErrUnauthorized
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects", nil)
	r.SetBasicAuth("bad", "creds")

	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestProjectsHandlerGet_success(t *testing.T) {
	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return makeTestProject(id, "demo"), nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/1", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Get(w, r, 1)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestProjectsHandlerGet_notFound(t *testing.T) {
	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return nil, nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/999", nil)
	r.SetBasicAuth("testuser", "pass")

	h.Get(w, r, 999)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestProjectsHandlerCreate_success(t *testing.T) {
	proj := &mock.ProjectService{
		CreateFunc: func(ctx context.Context, userID int64, p *model.Project) (*model.Project, error) {
			p.ID = 1
			p.Path = p.Name
			return p, nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	body := `{"name":"new-project","key":"NP"}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/projects", strings.NewReader(body))
	r.SetBasicAuth("testuser", "pass")

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", w.Code)
	}
}

func TestProjectsHandlerCreate_invalidJSON(t *testing.T) {
	proj := &mock.ProjectService{}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/projects", strings.NewReader("not json"))
	r.SetBasicAuth("testuser", "pass")

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

// ---------- UsersHandler tests ----------

func TestUsersHandlerList_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		ListUsersFunc: func(ctx context.Context) ([]*model.User, error) {
			return []*model.User{{ID: 1, Name: "alice", FullName: "Alice"}}, nil
		},
	}

	h := newUsersHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/users", nil)
	r.SetBasicAuth("alice", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestUsersHandlerList_queryFilter(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		ListUsersFunc: func(ctx context.Context) ([]*model.User, error) {
			return []*model.User{
				{ID: 1, Name: "alice", FullName: "Alice Smith"},
				{ID: 2, Name: "bob", FullName: "Bob Johnson"},
			}, nil
		},
	}

	h := newUsersHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/users?query=ali", nil)
	r.SetBasicAuth("alice", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var got []map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &got); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("len = %d, want 1", len(got))
	}
	if got[0]["name"] != "alice" {
		t.Fatalf("name = %v, want alice", got[0]["name"])
	}
}

func TestUsersHandlerList_unauthorized(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, security.ErrUnauthorized
		},
	}

	h := newUsersHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/users", nil)
	r.SetBasicAuth("bad", "creds")

	h.List(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestUsersHandlerMe_success(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newUsersHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/users/me", nil)
	r.SetBasicAuth("alice", "pass")

	h.Me(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var m map[string]any
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["name"] != "testuser" {
		t.Errorf("name = %q", m["name"])
	}
}

func TestUsersHandlerCreate_bootstrap(t *testing.T) {
	sec := &mock.SecurityService{
		HasLoginUserFunc: func(ctx context.Context) (bool, error) {
			return false, nil
		},
		CreateUserFunc: func(ctx context.Context, name, fullName, email, password string) (*model.User, error) {
			return &model.User{ID: 1, Name: name, FullName: fullName}, nil
		},
	}

	h := newUsersHandler(sec)
	body := `{"name":"admin","fullName":"Admin","email":"admin@test.com","password":"secret"}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/users", strings.NewReader(body))

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", w.Code)
	}
}

func TestUsersHandlerCreate_invalidJSON(t *testing.T) {
	sec := &mock.SecurityService{
		HasLoginUserFunc: func(ctx context.Context) (bool, error) {
			return false, nil
		},
	}

	h := newUsersHandler(sec)
	body := `not json`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/users", strings.NewReader(body))

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestUsersHandlerMe_unauthorized(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, security.ErrUnauthorized
		},
	}

	h := newUsersHandler(sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/users/me", nil)
	r.SetBasicAuth("bad", "creds")

	h.Me(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestProjectsHandlerSetup_success(t *testing.T) {
	proj := &mock.ProjectService{
		SetupFunc: func(ctx context.Context, userID int64, path string) (*model.Project, error) {
			return makeTestProject(1, "demo"), nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	body := `{"path":"demo"}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/projects/setup", strings.NewReader(body))
	r.SetBasicAuth("testuser", "pass")

	h.Setup(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestProjectsHandlerList_empty(t *testing.T) {
	proj := &mock.ProjectService{
		ListFunc: func(ctx context.Context) ([]*model.Project, error) {
			return nil, nil
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
	}

	h := newProjectsHandler(proj, sec)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects", nil)
	r.SetBasicAuth("testuser", "pass")

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestUsersHandlerCreate_authenticated(t *testing.T) {
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasLoginUserFunc: func(ctx context.Context) (bool, error) {
			return true, nil
		},
		CreateUserFunc: func(ctx context.Context, name, fullName, email, password string) (*model.User, error) {
			return &model.User{ID: 2, Name: name, FullName: fullName}, nil
		},
	}

	h := newUsersHandler(sec)
	body := `{"name":"newuser","fullName":"New User","email":"new@test.com","password":"secret"}`
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/~api/users", strings.NewReader(body))
	r.SetBasicAuth("admin", "pass")

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("status = %d, want 201", w.Code)
	}
}
