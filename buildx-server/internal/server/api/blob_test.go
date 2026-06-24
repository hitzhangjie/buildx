package api_test

import (
	"context"
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

func TestBlobHandlerServeHTTP_nonBlob(t *testing.T) {
	proj := &mock.ProjectService{}
	h := &api.BlobHandler{Projects: proj}

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/something/else", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("*", "something/else")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestBlobHandler_projectNotFound(t *testing.T) {
	proj := &mock.ProjectService{
		GetByPathFunc: func(ctx context.Context, path string) (*model.Project, error) {
			return nil, nil
		},
	}
	h := &api.BlobHandler{Projects: proj}

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/blob?revision=main&path=", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("*", "demo/blob")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ServeHTTP(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestBlobHandler_success(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	proj := &mock.ProjectService{
		GetByPathFunc: func(ctx context.Context, path string) (*model.Project, error) {
			return &model.Project{ID: 1, Name: "demo", Path: "demo"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return bareDir
		},
	}
	h := &api.BlobHandler{Projects: proj}

	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/blob?revision=main&path=", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("*", "demo/blob")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
}
