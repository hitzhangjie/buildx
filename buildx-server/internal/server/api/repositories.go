package api

import (
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// RepositoryHandler serves OneDev-compatible /~api/repositories endpoints.
type RepositoryHandler struct {
	Projects     projectService
	Security     securityService
	PullRequests effectivePullRequestFinder
}

func (h *RepositoryHandler) ListBranches(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.ListBranches")
	repo, proj, user, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}
	_ = user
	_ = proj

	names, err := repo.ListBranchNames()
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if names == nil {
		names = []string{}
	}
	op.OK(http.StatusOK, "count", len(names))
	writeJSON(w, r, http.StatusOK, names)
}

func (h *RepositoryHandler) GetDefaultBranch(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.GetDefaultBranch")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	if !repo.HasRefs() {
		op.OK(http.StatusNoContent, "has_refs", false)
		w.WriteHeader(http.StatusNoContent)
		return
	}
	branch := repo.DefaultRevision()
	op.OK(http.StatusOK, "branch", branch)
	writeJSON(w, r, http.StatusOK, branch)
}

func (h *RepositoryHandler) ListCommits(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.ListCommits")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	count := 100
	if countStr := r.URL.Query().Get("count"); countStr != "" {
		parsed, err := strconv.Atoi(countStr)
		if err != nil || parsed <= 0 {
			op.Fail(err, http.StatusBadRequest, "count", countStr)
			writeBadRequest(w, r, "invalid count", err)
			return
		}
		count = parsed
	}

	revision := r.URL.Query().Get("revision")
	op.With("revision", revision, "count", count)

	commits, err := repo.ListCommits(revision, count)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if commits == nil {
		commits = []git.Commit{}
	}
	op.OK(http.StatusOK, "returned", len(commits))
	writeJSON(w, r, http.StatusOK, commits)
}

func (h *RepositoryHandler) GetCommit(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.GetCommit")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	commitHash := chi.URLParam(r, "commitHash")
	if commitHash == "" {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "commit hash required", nil)
		return
	}
	op.With("commit_hash", commitHash)

	commit, err := repo.GetCommit(commitHash)
	if err != nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "commit", "commit_hash", commitHash)
		return
	}
	if commit == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "commit", "commit_hash", commitHash)
		return
	}

	if r.URL.Query().Get("diff") == "true" {
		op.With("include_diff", true)
		diffs, err := repo.DiffCommit(commitHash)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		commit.Diffs = diffs
	}

	op.OK(http.StatusOK, "commit_hash", commitHash)
	writeJSON(w, r, http.StatusOK, commit)
}

func (h *RepositoryHandler) GetBranch(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.GetBranch")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	branchName := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	if branchName == "" {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "branch name required", nil)
		return
	}
	// chi uses r.URL.RawPath for routing, which preserves URL-encoded characters
	// (e.g. %2F for /). Decode so branch names with slashes resolve correctly.
	branchName, err := url.PathUnescape(branchName)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid branch name", err)
		return
	}
	op.With("branch", branchName)

	detail, err := repo.BranchDetail(branchName)
	if err != nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "branch", "branch", branchName)
		return
	}
	op.OK(http.StatusOK, "branch", branchName)
	writeJSON(w, r, http.StatusOK, detail)
}

func (h *RepositoryHandler) ListTags(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.ListTags")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	names, err := repo.ListTagNames()
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if names == nil {
		names = []string{}
	}
	op.OK(http.StatusOK, "count", len(names))
	writeJSON(w, r, http.StatusOK, names)
}

func (h *RepositoryHandler) GetTag(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.GetTag")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	tagName := strings.TrimPrefix(chi.URLParam(r, "*"), "/")
	if tagName == "" {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "tag name required", nil)
		return
	}
	// chi uses r.URL.RawPath for routing, which preserves URL-encoded characters
	// (e.g. %2F for /). Decode so tag names with special characters resolve correctly.
	tagName, err := url.PathUnescape(tagName)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid tag name", err)
		return
	}
	op.With("tag", tagName)

	detail, err := repo.TagDetail(tagName)
	if err != nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "tag", "tag", tagName)
		return
	}
	op.OK(http.StatusOK, "tag", tagName)
	writeJSON(w, r, http.StatusOK, detail)
}

func (h *RepositoryHandler) openRepo(w http.ResponseWriter, r *http.Request, op *OpLog) (*git.Repository, *project.Project, *security.User, bool) {
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return nil, nil, nil, false
	}

	projectID, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
	if err != nil {
		op.Fail(err, http.StatusBadRequest, "project_id_raw", chi.URLParam(r, "projectId"))
		writeBadRequest(w, r, "invalid project id", err)
		return nil, nil, nil, false
	}
	op.With("user_id", user.ID, "project_id", projectID)

	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return nil, nil, nil, false
	}
	if proj == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return nil, nil, nil, false
	}

	ok, err := h.Security.HasProjectAccess(r.Context(), user.ID, proj.ID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return nil, nil, nil, false
	}
	if !ok {
		op.OK(http.StatusNotFound, "access", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return nil, nil, nil, false
	}

	gitDir := h.Projects.GitDir(proj.ID)
	repo, err := git.Open(gitDir)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError, "git_dir", gitDir)
		writeInternalError(w, r, err)
		return nil, nil, nil, false
	}
	return repo, proj, user, true
}

func (h *RepositoryHandler) authenticate(r *http.Request) (*security.User, error) {
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
