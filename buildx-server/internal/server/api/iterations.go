package api

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// IterationsHandler serves OneDev-compatible iteration endpoints.
type IterationsHandler struct {
	Iterations iterationStore
	Projects   projectService
	Security   securityService
}

type iterationStore interface {
	CreateIteration(ctx context.Context, iter *model.Iteration) (*model.Iteration, error)
	GetIteration(ctx context.Context, id int64) (*model.Iteration, error)
	ListIterations(ctx context.Context, projectID int64, name string, closed *bool, offset, count int) ([]*model.Iteration, error)
	UpdateIteration(ctx context.Context, iter *model.Iteration) (*model.Iteration, error)
	DeleteIteration(ctx context.Context, id int64) error
	ListIssuesByIteration(ctx context.Context, iterationID int64) ([]*model.Issue, error)
	CountIssuesByIterationState(ctx context.Context, iterationID int64) (map[string]int, error)
}

type iterationBody struct {
	Project *struct {
		ID int64 `json:"id"`
	} `json:"project"`
	Name        string `json:"name"`
	Description string `json:"description"`
	StartDay    *int64 `json:"startDay"`
	DueDay      *int64 `json:"dueDay"`
	Closed      bool   `json:"closed"`
}

func (b iterationBody) projectID() int64 {
	if b.Project != nil {
		return b.Project.ID
	}
	return 0
}

func (b iterationBody) toModel(projectID int64) *model.Iteration {
	pid := projectID
	if pid == 0 {
		pid = b.projectID()
	}
	return &model.Iteration{
		ProjectID:   pid,
		Name:        b.Name,
		Description: b.Description,
		StartDay:    b.StartDay,
		DueDay:      b.DueDay,
		Closed:      b.Closed,
	}
}

// QueryByProject handles GET /~api/projects/{projectId}/iterations.
func (h *IterationsHandler) QueryByProject(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "IterationsHandler.QueryByProject", "project_id", projectID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if proj == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}
	if !h.canAccessProject(r, user, projectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	name := r.URL.Query().Get("name")
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	count, _ := strconv.Atoi(r.URL.Query().Get("count"))

	var closed *bool
	if v := r.URL.Query().Get("closed"); v != "" {
		b := v == "true"
		closed = &b
	}

	iters, err := h.Iterations.ListIterations(r.Context(), projectID, name, closed, offset, count)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if iters == nil {
		iters = []*model.Iteration{}
	}

	op.OK(http.StatusOK, "count", len(iters))
	writeJSON(w, r, http.StatusOK, iters)
}

// Get handles GET /~api/iterations/{iterationId}.
func (h *IterationsHandler) Get(w http.ResponseWriter, r *http.Request, iterationID int64) {
	op := StartOp(r, "IterationsHandler.Get", "iteration_id", iterationID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iter, err := h.Iterations.GetIteration(r.Context(), iterationID)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessProject(r, user, iter.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, iter)
}

// Create handles POST /~api/iterations.
func (h *IterationsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IterationsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var body iterationBody
	if err := decodeJSON(r, &body); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	iter := body.toModel(0)
	if iter.ProjectID == 0 || strings.TrimSpace(iter.Name) == "" {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "project.id and name are required")
		return
	}
	if !h.canManageIssues(r, user, iter.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	created, err := h.Iterations.CreateIteration(r.Context(), iter)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusCreated, "iteration_id", created.ID)
	writeJSON(w, r, http.StatusCreated, created.ID)
}

// Update handles POST /~api/iterations/{iterationId}.
func (h *IterationsHandler) Update(w http.ResponseWriter, r *http.Request, iterationID int64) {
	op := StartOp(r, "IterationsHandler.Update", "iteration_id", iterationID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	existing, err := h.Iterations.GetIteration(r.Context(), iterationID)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	var body iterationBody
	if err := decodeJSON(r, &body); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	iter := body.toModel(existing.ProjectID)
	iter.ID = iterationID
	if strings.TrimSpace(iter.Name) == "" {
		iter.Name = existing.Name
	}

	if !h.canManageIssues(r, user, existing.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	updated, err := h.Iterations.UpdateIteration(r.Context(), iter)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusOK, "iteration_id", updated.ID)
	writeJSON(w, r, http.StatusOK, updated.ID)
}

// Delete handles DELETE /~api/iterations/{iterationId}.
func (h *IterationsHandler) Delete(w http.ResponseWriter, r *http.Request, iterationID int64) {
	op := StartOp(r, "IterationsHandler.Delete", "iteration_id", iterationID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	existing, err := h.Iterations.GetIteration(r.Context(), iterationID)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canManageIssues(r, user, existing.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Iterations.DeleteIteration(r.Context(), iterationID); err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// ListIssues handles GET /~api/iterations/{iterationId}/issues.
func (h *IterationsHandler) ListIssues(w http.ResponseWriter, r *http.Request, iterationID int64) {
	op := StartOp(r, "IterationsHandler.ListIssues", "iteration_id", iterationID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iter, err := h.Iterations.GetIteration(r.Context(), iterationID)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessProject(r, user, iter.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	issues, err := h.Iterations.ListIssuesByIteration(r.Context(), iterationID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if issues == nil {
		issues = []*model.Issue{}
	}

	op.OK(http.StatusOK, "count", len(issues))
	writeJSON(w, r, http.StatusOK, issues)
}

// BurndownStats handles GET /~api/iterations/{iterationId}/burndown.
func (h *IterationsHandler) BurndownStats(w http.ResponseWriter, r *http.Request, iterationID int64) {
	op := StartOp(r, "IterationsHandler.BurndownStats", "iteration_id", iterationID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iter, err := h.Iterations.GetIteration(r.Context(), iterationID)
	if err != nil {
		if errors.Is(err, issue.ErrIterationNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "iteration", "iteration_id", iterationID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessProject(r, user, iter.ProjectID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	stats, err := h.Iterations.CountIssuesByIterationState(r.Context(), iterationID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if stats == nil {
		stats = map[string]int{}
	}

	total := 0
	closed := stats[issue.StateClosed]
	for _, n := range stats {
		total += n
	}
	open := total - closed

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]any{
		"total":  total,
		"open":   open,
		"closed": closed,
		"byState": stats,
	})
}

func (h *IterationsHandler) canAccessProject(r *http.Request, user *model.User, projectID int64) bool {
	uid := model.UserRootID
	if user != nil {
		uid = user.ID
	}
	ok, _ := h.Security.HasProjectAccess(r.Context(), uid, projectID)
	return ok
}

func (h *IterationsHandler) canManageIssues(r *http.Request, user *model.User, projectID int64) bool {
	if user == nil {
		return false
	}
	if user.ID == model.UserRootID {
		return true
	}
	ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, projectID)
	return ok
}

func (h *IterationsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *IterationsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseIterationID reads the iterationId path parameter.
func ParseIterationID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "iterationId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid iteration id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}
