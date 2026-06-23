package api

import (
	"net/http"
	"net/url"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
)

// BlobHandler serves file and directory browsing from project git repos.
type BlobHandler struct {
	Projects *project.DBStore
}

// ServeHTTP handles wildcard requests under /~api/projects/* and dispatches
// blob requests (those ending with /blob). Falls through to 404 for other paths.
func (h *BlobHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rest := chi.URLParam(r, "*")
	if !strings.HasSuffix(rest, "/blob") {
		writeNotFound(w, r, "api_path", "rest", rest)
		return
	}

	projectPath := strings.TrimSuffix(rest, "/blob")
	if projectPath == "" || projectPath == "/" {
		writeNotFound(w, r, "project_path")
		return
	}

	if !strings.Contains(projectPath, "/") {
		if r.URL.RawPath != "" {
			rawPrefix := "/~api/projects/"
			rawSuffix := "/blob"
			rawPath := r.URL.RawPath
			if idx := strings.Index(rawPath, rawPrefix); idx >= 0 {
				start := idx + len(rawPrefix)
				if end := strings.LastIndex(rawPath, rawSuffix); end > start {
					decoded, err := url.PathUnescape(rawPath[start:end])
					if err == nil {
						projectPath = decoded
					}
				}
			}
		}
	}

	revision := r.URL.Query().Get("revision")
	path := r.URL.Query().Get("path")
	h.Blob(w, r, projectPath, revision, path)
}

// Blob looks up the project by path and returns the blob content at the
// given revision:path.
func (h *BlobHandler) Blob(w http.ResponseWriter, r *http.Request, projectPath, revision, path string) {
	op := StartOp(r, "BlobHandler.Blob",
		"project_path", projectPath,
		"revision", revision,
		"path", path,
	)

	proj, err := h.Projects.GetByPath(r.Context(), projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if proj == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_path", projectPath)
		return
	}
	op.With("project_id", proj.ID)

	gitDir := h.Projects.GitDir(proj.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError, "git_dir", gitDir)
		writeInternalError(w, r, err)
		return
	}

	content, err := repo.Blob(r.Context(), revision, path)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if content == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "blob", "revision", revision, "path", path)
		return
	}

	op.OK(http.StatusOK, "type", content.Type)
	writeJSON(w, r, http.StatusOK, content)
}
