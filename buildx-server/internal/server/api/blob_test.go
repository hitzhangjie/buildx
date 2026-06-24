package api_test

import (
	"context"
	"encoding/base64"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os/exec"
	"strings"
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

func TestBlobHanlder_Read(t *testing.T) {
	t.Run("InvalidURIPathSuffix", func(t *testing.T) {
		handler := &api.BlobHandler{
			Projects: &mock.ProjectService{},
		}

		recorder := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/~api/projects/something/else", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "something/else")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		handler.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", recorder.Code)
		}
	})

	t.Run("NotExistedProjectName", func(t *testing.T) {
		proj := &mock.ProjectService{
			GetByPathFunc: func(ctx context.Context, path string) (*model.Project, error) {
				return nil, nil
			},
		}
		handler := &api.BlobHandler{Projects: proj}

		recorder := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/blob?revision=main&path=", nil)
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "demo/blob")
		req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

		handler.ServeHTTP(recorder, req)

		if recorder.Code != http.StatusNotFound {
			t.Errorf("status = %d, want 404", recorder.Code)
		}
	})

	t.Run("Success", func(t *testing.T) {
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
	})
}

func TestBlobHandler_CreateFile(t *testing.T) {
	t.Run("Unauthorized", func(t *testing.T) {
		sec := &mock.SecurityService{
			AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
				return nil, security.ErrInvalidCredentials
			},
		}
		proj := &mock.ProjectService{}
		h := &api.BlobHandler{Projects: proj, Security: sec}

		r := httptest.NewRequest(http.MethodPost, "/~api/projects/demo/files/main/test.txt",
			strings.NewReader(`{"commitMessage":"m","base64Content":"dGVzdA=="}`))
		r.SetBasicAuth("user", "wrong")
		r.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "demo/files/main/test.txt")
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		w := httptest.NewRecorder()
		h.FilesPost(w, r)

		if w.Code != http.StatusUnauthorized {
			t.Errorf("status = %d, want 401", w.Code)
		}
	})

	t.Run("MissingFilePath", func(t *testing.T) {
		authUser := &model.User{ID: 1, Name: "admin"}
		sec := &mock.SecurityService{
			AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
				return authUser, nil
			},
		}
		proj := &mock.ProjectService{}
		h := &api.BlobHandler{Projects: proj, Security: sec}

		// Missing file path — only revision, no path.
		r := httptest.NewRequest(http.MethodPost, "/~api/projects/demo/files/main",
			strings.NewReader(`{"commitMessage":"m","base64Content":"dGVzdA=="}`))
		r.SetBasicAuth("admin", "pass")
		r.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "demo/files/main")
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		w := httptest.NewRecorder()
		h.FilesPost(w, r)

		if w.Code != http.StatusBadRequest {
			t.Errorf("status = %d, want 400", w.Code)
		}
	})

	t.Run("Success", func(t *testing.T) {
		if _, err := exec.LookPath("git"); err != nil {
			t.Skip("git not found")
		}
		bareDir, _, _ := testutil.SetupBareWithCommit(t)

		authUser := &model.User{ID: 1, Name: "admin", FullName: "Admin"}
		sec := &mock.SecurityService{
			AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
				return authUser, nil
			},
			IsProjectOwnerFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
				return true, nil
			},
		}

		proj := &mock.ProjectService{
			GetByPathFunc: func(ctx context.Context, path string) (*model.Project, error) {
				return &model.Project{ID: 1, Name: "demo", Path: "demo"}, nil
			},
			GitDirFunc: func(projectID int64) string {
				return bareDir
			},
		}
		h := &api.BlobHandler{Projects: proj, Security: sec}

		// Build request: create CONTRIBUTION.md on main branch.
		{
			body := `{"commitMessage":"add contribution","base64Content":"` +
				base64.StdEncoding.EncodeToString([]byte("# Contribution\n")) + `"}`
			r := httptest.NewRequest(http.MethodPost, "/~api/projects/demo/files/main/CONTRIBUTION.md",
				strings.NewReader(body))
			r.SetBasicAuth("admin", "pass")
			r.Header.Set("Content-Type", "application/json")
			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("*", "demo/files/main/CONTRIBUTION.md")
			r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

			w := httptest.NewRecorder()
			h.FilesPost(w, r)

			if w.Code != http.StatusOK {
				t.Errorf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
			}
		}

		// Verify the file was committed by reading it back via blob handler.
		{
			w2 := httptest.NewRecorder()
			r2 := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/blob?revision=main&path=CONTRIBUTION.md", nil)
			rctx2 := chi.NewRouteContext()
			rctx2.URLParams.Add("*", "demo/blob")
			r2 = r2.WithContext(context.WithValue(r2.Context(), chi.RouteCtxKey, rctx2))

			h.ServeHTTP(w2, r2)
			if w2.Code != http.StatusOK {
				t.Fatalf("blob read status = %d, want 200", w2.Code)
			}
			if !strings.Contains(w2.Body.String(), "# Contribution") {
				t.Errorf("blob content does not contain expected text: %s", w2.Body.String())
			}
		}
	})

}

func TestBlobHandler_DeleteFile(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	bareDir, _, _ := testutil.SetupBareWithCommit(t)

	authUser := &model.User{ID: 1, Name: "admin", FullName: "Admin"}
	sec := &mock.SecurityService{
		AuthenticateFunc: func(ctx context.Context, username, password string) (*model.User, error) {
			return authUser, nil
		},
		IsProjectOwnerFunc: func(ctx context.Context, userID, projectID int64) (bool, error) {
			return true, nil
		},
	}

	proj := &mock.ProjectService{
		GetByPathFunc: func(ctx context.Context, path string) (*model.Project, error) {
			return &model.Project{ID: 1, Name: "demo", Path: "demo"}, nil
		},
		GitDirFunc: func(projectID int64) string {
			return bareDir
		},
	}
	h := &api.BlobHandler{Projects: proj, Security: sec}

	// Create a file to delete.
	{
		body := `{"commitMessage":"add temp","base64Content":"` +
			base64.StdEncoding.EncodeToString([]byte("temp\n")) + `"}`
		r := httptest.NewRequest(http.MethodPost, "/~api/projects/demo/files/main/temp.txt",
			strings.NewReader(body))
		r.SetBasicAuth("admin", "pass")
		r.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "demo/files/main/temp.txt")
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		w := httptest.NewRecorder()
		h.FilesPost(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("create status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}
	}

	// Delete the file.
	{
		r := httptest.NewRequest(http.MethodPost, "/~api/projects/demo/files/main/temp.txt",
			strings.NewReader(`{"commitMessage":"delete temp"}`))
		r.SetBasicAuth("admin", "pass")
		r.Header.Set("Content-Type", "application/json")
		rctx := chi.NewRouteContext()
		rctx.URLParams.Add("*", "demo/files/main/temp.txt")
		r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

		w := httptest.NewRecorder()
		h.FilesPost(w, r)
		if w.Code != http.StatusOK {
			t.Fatalf("delete status = %d, want 200 (body: %s)", w.Code, w.Body.String())
		}
	}

	// Verify the file is gone.
	{
		w2 := httptest.NewRecorder()
		r2 := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/blob?revision=main&path=temp.txt", nil)
		rctx2 := chi.NewRouteContext()
		rctx2.URLParams.Add("*", "demo/blob")
		r2 = r2.WithContext(context.WithValue(r2.Context(), chi.RouteCtxKey, rctx2))

		h.ServeHTTP(w2, r2)
		if w2.Code != http.StatusNotFound {
			t.Fatalf("blob read status = %d, want 404", w2.Code)
		}
	}
}

func TestBlobHandler_RawBlob(t *testing.T) {
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
	r := httptest.NewRequest(http.MethodGet, "/~api/projects/demo/raw?revision=main&path=README.md&disposition=attachment", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("*", "demo/raw")
	r = r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))

	h.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	if !strings.Contains(w.Header().Get("Content-Disposition"), "attachment") {
		t.Fatalf("Content-Disposition = %q, want attachment", w.Header().Get("Content-Disposition"))
	}
	if !strings.Contains(w.Body.String(), "#") {
		t.Errorf("body does not contain file content: %s", w.Body.String())
	}
}
