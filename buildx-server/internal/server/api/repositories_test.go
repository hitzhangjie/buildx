package api_test

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil/mock"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestRepositoryHandlerListBranches_success(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return &model.Project{ID: id, Name: "test", Path: "test"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return bareDir
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasProjectAccessFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/branches", nil)
	r.SetBasicAuth("testuser", "pass")

	// Need chi URL params for projectId.
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ListBranches(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestRepositoryHandlerListBranches_unauthorized(t *testing.T) {
	proj := &mock.ProjectService{}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return nil, security.ErrUnauthorized
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/branches", nil)
	r.SetBasicAuth("bad", "creds")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ListBranches(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("status = %d, want 401", w.Code)
	}
}

func TestRepositoryHandlerGetDefaultBranch_empty(t *testing.T) {
	dir := t.TempDir()
	gitDir := dir + "/repo.git"
	testutil.InitBareRepo(t, gitDir)

	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return &model.Project{ID: id, Name: "test", Path: "test"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return gitDir
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasProjectAccessFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/default-branch", nil)
	r.SetBasicAuth("testuser", "pass")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.GetDefaultBranch(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("status = %d, want 204", w.Code)
	}
}

func TestRepositoryHandlerListTags_empty(t *testing.T) {
	dir := t.TempDir()
	gitDir := dir + "/repo.git"
	testutil.InitBareRepo(t, gitDir)

	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return &model.Project{ID: id, Name: "test", Path: "test"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return gitDir
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasProjectAccessFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/tags", nil)
	r.SetBasicAuth("testuser", "pass")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ListTags(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
}

func TestRepositoryHandlerGetBranch_success(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return &model.Project{ID: id, Name: "test", Path: "test"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return bareDir
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasProjectAccessFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/branches/main", nil)
	r.SetBasicAuth("testuser", "pass")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	rctx.URLParams.Add("*", "/main")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.GetBranch(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
}

func TestRepositoryHandlerCompare_success(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.CommitFile(t, workDir, "feature.txt", "feature\n", "feature commit")
	testutil.Push(t, workDir, bareDir, "HEAD:refs/heads/feature")

	proj := &mock.ProjectService{
		GetFunc: func(ctx context.Context, id int64) (*model.Project, error) {
			return &model.Project{ID: id, Name: "test", Path: "test"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return bareDir
		},
	}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return makeTestUser(1), nil
		},
		HasProjectAccessFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	h := &api.RepositoryHandler{Projects: proj, Security: sec}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/compare?left=main&right=feature&include-commits=true&include-diffs=true", nil)
	r.SetBasicAuth("testuser", "pass")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.Compare(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}

	var result api.CompareResult
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatal(err)
	}
	if result.MergeBase == nil {
		t.Fatal("expected merge base")
	}
	if len(result.Commits) == 0 {
		t.Error("expected commits in compare result")
	}
	if len(result.Diffs) == 0 {
		t.Error("expected diffs in compare result")
	}
}
