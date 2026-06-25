package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// CodeStatsHandler serves statistics API endpoints for code contributions,
// source lines, and top contributors.
type CodeStatsHandler struct {
	Projects projectService
	Security securityService
}

// OverallContributions returns per-day aggregate (commits, additions, deletions)
// for the default branch of a project. Corresponds to OneDev's
// CommitInfoService.getOverallContributions().
//
//	GET /~api/projects/{projectId}/stats/code/overall-contributions
func (h *CodeStatsHandler) OverallContributions(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "CodeStatsHandler.OverallContributions", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	p, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if p == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}

	repo, err := git.Open(h.Projects.GitDir(projectID))
	if err != nil {
		// No repo yet — return empty data, not an error.
		op.OK(http.StatusOK, "contributions", 0)
		writeJSON(w, r, http.StatusOK, map[int]*git.Contribution{})
		return
	}

	data, err := repo.GetOverallContributions("")
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if data == nil {
		data = map[int]*git.Contribution{}
	}

	op.OK(http.StatusOK, "days", len(data))
	writeJSON(w, r, http.StatusOK, data)
}

// LineIncrements returns per-day net line changes grouped by programming
// language for the default branch of a project. Corresponds to OneDev's
// CommitInfoService.getLineIncrements().
//
//	GET /~api/projects/{projectId}/stats/code/line-increments
func (h *CodeStatsHandler) LineIncrements(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "CodeStatsHandler.LineIncrements", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	p, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if p == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}

	repo, err := git.Open(h.Projects.GitDir(projectID))
	if err != nil {
		op.OK(http.StatusOK, "entries", 0)
		writeJSON(w, r, http.StatusOK, map[int]map[string]int{})
		return
	}

	data, err := repo.GetLineIncrements("")
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if data == nil {
		data = map[int]map[string]int{}
	}

	op.OK(http.StatusOK, "days", len(data))
	writeJSON(w, r, http.StatusOK, data)
}

// TopContributors returns the top N contributors by a given contribution type
// within a date range. Corresponds to OneDev's TopContributorsResource.
//
//	GET /~api/projects/{projectId}/stats/code/top-contributors?type=COMMITS&from=20000&to=21000
func (h *CodeStatsHandler) TopContributors(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "CodeStatsHandler.TopContributors", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	contribType := r.URL.Query().Get("type")
	if contribType == "" {
		contribType = "COMMITS"
	}
	if !isValidContribType(contribType) {
		op.Fail(errors.New("invalid type"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "type must be COMMITS, ADDITIONS, or DELETIONS")
		return
	}

	fromStr := r.URL.Query().Get("from")
	toStr := r.URL.Query().Get("to")
	if fromStr == "" || toStr == "" {
		op.Fail(errors.New("missing from/to"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "query parameters 'from' and 'to' (epoch day) are required")
		return
	}
	fromDay, err := strconv.Atoi(fromStr)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "from is not a valid integer")
		return
	}
	toDay, err := strconv.Atoi(toStr)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "to is not a valid integer")
		return
	}

	p, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if p == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}

	repo, err := git.Open(h.Projects.GitDir(projectID))
	if err != nil {
		op.OK(http.StatusOK, "contributors", 0)
		writeJSON(w, r, http.StatusOK, []*git.Contributor{})
		return
	}

	const maxTop = 100 // matches OneDev's TOP_CONTRIBUTORS constant
	data, err := repo.GetTopContributors("", maxTop, contribType, fromDay, toDay)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if data == nil {
		data = []*git.Contributor{}
	}

	op.OK(http.StatusOK, "count", len(data))
	writeJSON(w, r, http.StatusOK, data)
}

func isValidContribType(t string) bool {
	switch t {
	case "COMMITS", "ADDITIONS", "DELETIONS":
		return true
	}
	return false
}

func (h *CodeStatsHandler) authenticate(r *http.Request) (*security.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	return nil, security.ErrUnauthorized
}
