package api

import (
	"encoding/base64"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// BlobHandler serves file and directory browsing from project git repos.
// It also dispatches search requests to SearchHandler.
type BlobHandler struct {
	Projects projectService
	Security securityService
	Search   *SearchHandler // set to enable search endpoints
}

// ServeHTTP handles wildcard requests under /~api/projects/* and dispatches
// to blob, search, or file handlers based on the URL suffix.
func (h *BlobHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	rest := chi.URLParam(r, "*")

	// Dispatch search requests.
	if h.Search != nil {
		if strings.HasSuffix(rest, "/search/quick") {
			h.Search.SearchQuick(w, r)
			return
		}
		if strings.HasSuffix(rest, "/search/text") {
			h.Search.SearchText(w, r)
			return
		}
		if strings.HasSuffix(rest, "/search/files") {
			h.Search.SearchFiles(w, r)
			return
		}
	}

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

// ---------------------------------------------------------------------------
// Files POST — create/update file
// ---------------------------------------------------------------------------

// fileEditRequest is the JSON body for file create/update requests.
// Matches OneDev's FileCreateOrUpdateRequest.
type fileEditRequest struct {
	CommitMessage string `json:"commitMessage"`
	Base64Content string `json:"base64Content"`
}

// FilesPost handles POST /~api/projects/{projectPath}/files/{revision}/{path}.
// It creates or updates a file and returns the new commit hash.
func (h *BlobHandler) FilesPost(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "BlobHandler.FilesPost")

	// Authenticate.
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	// Parse wildcard: {projectPath}/files/{revision}/{filePath}
	rest := chi.URLParam(r, "*")

	// Try RawPath first for encoded slashes, otherwise use decoded path.
	// Same pattern as ServeHTTP.
	if r.URL.RawPath != "" {
		rawPrefix := "/~api/projects/"
		if idx := strings.Index(r.URL.RawPath, rawPrefix); idx >= 0 {
			start := idx + len(rawPrefix)
			decoded, decErr := url.PathUnescape(r.URL.RawPath[start:])
			if decErr == nil {
				rest = decoded
			}
		}
	}

	idx := strings.Index(rest, "/files/")
	if idx < 0 {
		op.OK(http.StatusNotFound, "reason", "missing /files/ segment")
		writeNotFound(w, r, "files_endpoint", "rest", rest)
		return
	}
	projectPath := rest[:idx]
	revisionAndPath := rest[idx+len("/files/"):]

	slashIdx := strings.Index(revisionAndPath, "/")
	if slashIdx < 0 {
		op.OK(http.StatusBadRequest, "reason", "missing file path after revision")
		writeBadRequest(w, r, "request must include file path after revision", nil)
		return
	}
	revision := revisionAndPath[:slashIdx]
	filePath := revisionAndPath[slashIdx+1:]

	op.With("project_path", projectPath, "revision", revision, "file_path", filePath)

	// Decode request body.
	var req fileEditRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("commit_message", req.CommitMessage)

	// Decode base64 content.
	content, err := base64.StdEncoding.DecodeString(req.Base64Content)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid base64 content", err)
		return
	}

	// Look up project.
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

	// Check write access.
	if user.ID != model.UserRootID {
		hasAccess, accErr := h.Security.IsProjectOwner(r.Context(), user.ID, proj.ID)
		if accErr != nil {
			op.Fail(accErr, http.StatusInternalServerError)
			writeInternalError(w, r, accErr)
			return
		}
		if !hasAccess {
			op.OK(http.StatusForbidden, "reason", "not project owner")
			writeJSONError(w, http.StatusForbidden, "write access denied")
			return
		}
	}

	// Open git repo.
	gitDir := h.Projects.GitDir(proj.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError, "git_dir", gitDir)
		writeInternalError(w, r, err)
		return
	}

	// Build author signature.
	authorName := user.FullName
	if authorName == "" {
		authorName = user.Name
	}
	author := object.Signature{
		Name:  authorName,
		Email: user.Name + "@buildx.local",
		When:  time.Now(),
	}

	// Commit the file.
	commitHash, err := repo.CommitFile(r.Context(), revision, filePath, string(content), author, req.CommitMessage)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK, "commit_hash", commitHash)
	writeJSON(w, r, http.StatusOK, map[string]string{
		"commitHash": commitHash,
	})
}

func (h *BlobHandler) authenticate(r *http.Request) (*model.User, error) {
	// Check context first (populated by CookieAuth middleware).
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])
		return h.Security.AuthenticateToken(r.Context(), token)
	}
	return nil, security.ErrUnauthorized
}
