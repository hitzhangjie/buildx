package api

import (
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// RepositoryHandler serves OneDev-compatible /~api/repositories endpoints.
type RepositoryHandler struct {
	Projects *project.DBStore
	Security *security.DBStore
}

func (h *RepositoryHandler) ListBranches(w http.ResponseWriter, r *http.Request) {
	repo, ok := h.openRepo(w, r)
	if !ok {
		return
	}

	names, err := repo.ListBranchNames()
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if names == nil {
		names = []string{}
	}
	writeJSON(w, http.StatusOK, names)
}

func (h *RepositoryHandler) GetDefaultBranch(w http.ResponseWriter, r *http.Request) {
	repo, ok := h.openRepo(w, r)
	if !ok {
		return
	}

	if !repo.HasRefs() {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	writeJSON(w, http.StatusOK, repo.DefaultRevision())
}

func (h *RepositoryHandler) GetBranch(w http.ResponseWriter, r *http.Request) {
	repo, ok := h.openRepo(w, r)
	if !ok {
		return
	}

	branchName := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	if branchName == "" {
		http.Error(w, "branch name required", http.StatusBadRequest)
		return
	}

	detail, err := repo.BranchDetail(branchName)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, detail)
}

func (h *RepositoryHandler) openRepo(w http.ResponseWriter, r *http.Request) (*git.Repository, bool) {
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return nil, false
	}

	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid project id", http.StatusBadRequest)
		return nil, false
	}

	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		writeInternalError(w, err)
		return nil, false
	}
	if proj == nil {
		http.NotFound(w, r)
		return nil, false
	}

	ok, err := h.Security.HasProjectAccess(r.Context(), user.ID, proj.ID)
	if err != nil {
		writeInternalError(w, err)
		return nil, false
	}
	if !ok {
		http.NotFound(w, r)
		return nil, false
	}

	gitDir := h.Projects.GitDir(proj.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		writeInternalError(w, err)
		return nil, false
	}
	return repo, true
}

func (h *RepositoryHandler) authenticate(r *http.Request) (*security.User, error) {
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
