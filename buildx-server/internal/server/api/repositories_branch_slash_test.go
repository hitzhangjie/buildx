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
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil/mock"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestGetBranch_slashInName(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithBranch(t, "feat/commitgraph")

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
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/branches/feat%2Fcommitgraph", nil)
	r.SetBasicAuth("testuser", "pass")
	// Simulate chi routing with r.URL.RawPath — chi uses RawPath when present,
	// which preserves URL-encoded characters like %2F.
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	rctx.URLParams.Add("*", "/feat%2Fcommitgraph") // raw path value from chi
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.GetBranch(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	var detail struct {
		RefName    string `json:"refName"`
		CommitHash string `json:"commitHash"`
	}
	if err := json.NewDecoder(w.Body).Decode(&detail); err != nil {
		t.Fatal(err)
	}
	if detail.RefName != "refs/heads/feat/commitgraph" {
		t.Errorf("refName = %q, want %q", detail.RefName, "refs/heads/feat/commitgraph")
	}
	if detail.CommitHash == "" {
		t.Error("expected non-empty commitHash")
	}
}

func TestGetTag_slashInName(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, workDir, _ := testutil.SetupBareWithCommit(t)
	testutil.AddTag(t, workDir, "feat/feature-tag", "HEAD", "a tag with slash")
	testutil.Push(t, workDir, bareDir, "refs/tags/feat/feature-tag")

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
	r := httptest.NewRequest(http.MethodGet, "/~api/repositories/1/tags/feat%2Ffeature-tag", nil)
	r.SetBasicAuth("testuser", "pass")
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("projectId", "1")
	rctx.URLParams.Add("*", "/feat%2Ffeature-tag") // raw path value from chi
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.GetTag(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	var detail struct {
		RefName    string `json:"refName"`
		CommitHash string `json:"commitHash"`
	}
	if err := json.NewDecoder(w.Body).Decode(&detail); err != nil {
		t.Fatal(err)
	}
	if detail.RefName != "refs/tags/feat/feature-tag" {
		t.Errorf("refName = %q, want %q", detail.RefName, "refs/tags/feat/feature-tag")
	}
	if detail.CommitHash == "" {
		t.Error("expected non-empty commitHash")
	}
}
