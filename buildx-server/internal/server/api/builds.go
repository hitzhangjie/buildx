package api

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const maxBuildPageSize = 100

// BuildsHandler serves OneDev-compatible /~api/builds endpoints.
type BuildsHandler struct {
	Builds   buildStore
	Projects projectService
	Security securityService
	Jobs     JobService // optional, for run/cancel operations
}

type buildStore interface {
	Get(ctx context.Context, id int64) (*model.Build, error)
	GetByNumber(ctx context.Context, projectID int64, number int) (*model.Build, error)
	Query(ctx context.Context, filter build.QueryFilter, offset, count int) ([]*model.Build, error)
	UpdateDescription(ctx context.Context, id int64, description string) error
	Delete(ctx context.Context, id int64) error
	ListLabels(ctx context.Context, buildID int64) ([]*model.BuildLabel, error)
	ListParams(ctx context.Context, buildID int64) ([]*model.BuildParam, error)
	ListDependencies(ctx context.Context, buildID int64) ([]*model.BuildDependence, error)
	ListDependents(ctx context.Context, buildID int64) ([]*model.BuildDependence, error)
}

// Get handles GET /~api/builds/{buildId}.
func (h *BuildsHandler) Get(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.Get", "build_id", buildID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, b)
}

// Query handles GET /~api/builds.
func (h *BuildsHandler) Query(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "BuildsHandler.Query")
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	query := r.URL.Query().Get("query")
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	count, _ := strconv.Atoi(r.URL.Query().Get("count"))
	if count <= 0 {
		count = 100
	}
	if count > maxBuildPageSize {
		op.Fail(errors.New("count too large"), http.StatusNotAcceptable)
		writeJSONError(w, http.StatusNotAcceptable, "count should not be greater than "+strconv.Itoa(maxBuildPageSize))
		return
	}

	filter := build.ParseQuery(query)
	if projectIDStr := r.URL.Query().Get("projectId"); projectIDStr != "" {
		if id, err := strconv.ParseInt(projectIDStr, 10, 64); err == nil {
			filter.ProjectID = id
		}
	}

	builds, err := h.Builds.Query(r.Context(), filter, offset, count)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	var visible []*model.Build
	for _, b := range builds {
		if h.canAccessBuild(r, user, b) {
			visible = append(visible, b)
		}
	}
	if visible == nil {
		visible = []*model.Build{}
	}

	op.OK(http.StatusOK, "count", len(visible))
	writeJSON(w, r, http.StatusOK, visible)
}

// ListLabels handles GET /~api/builds/{buildId}/labels.
func (h *BuildsHandler) ListLabels(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.ListLabels", "build_id", buildID)
	if !h.withBuildAccess(w, r, op, buildID, func(b *model.Build) {
		labels, err := h.Builds.ListLabels(r.Context(), buildID)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if labels == nil {
			labels = []*model.BuildLabel{}
		}
		op.OK(http.StatusOK, "count", len(labels))
		writeJSON(w, r, http.StatusOK, labels)
	}) {
		return
	}
}

// ListParams handles GET /~api/builds/{buildId}/params.
func (h *BuildsHandler) ListParams(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.ListParams", "build_id", buildID)
	if !h.withBuildAccess(w, r, op, buildID, func(b *model.Build) {
		params, err := h.Builds.ListParams(r.Context(), buildID)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if params == nil {
			params = []*model.BuildParam{}
		}
		for _, p := range params {
			if strings.EqualFold(p.Type, "Secret") {
				p.Value = "********"
			}
		}
		op.OK(http.StatusOK, "count", len(params))
		writeJSON(w, r, http.StatusOK, params)
	}) {
		return
	}
}

// ListDependencies handles GET /~api/builds/{buildId}/dependencies.
func (h *BuildsHandler) ListDependencies(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.ListDependencies", "build_id", buildID)
	if !h.withBuildAccess(w, r, op, buildID, func(b *model.Build) {
		deps, err := h.Builds.ListDependencies(r.Context(), buildID)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if deps == nil {
			deps = []*model.BuildDependence{}
		}
		op.OK(http.StatusOK, "count", len(deps))
		writeJSON(w, r, http.StatusOK, deps)
	}) {
		return
	}
}

// ListDependents handles GET /~api/builds/{buildId}/dependents.
func (h *BuildsHandler) ListDependents(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.ListDependents", "build_id", buildID)
	if !h.withBuildAccess(w, r, op, buildID, func(b *model.Build) {
		deps, err := h.Builds.ListDependents(r.Context(), buildID)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if deps == nil {
			deps = []*model.BuildDependence{}
		}
		op.OK(http.StatusOK, "count", len(deps))
		writeJSON(w, r, http.StatusOK, deps)
	}) {
		return
	}
}

// ListFixedIssueIDs handles GET /~api/builds/{buildId}/fixed-issue-ids.
func (h *BuildsHandler) ListFixedIssueIDs(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.ListFixedIssueIDs", "build_id", buildID)
	h.withBuildAccess(w, r, op, buildID, func(b *model.Build) {
		op.OK(http.StatusOK)
		writeJSON(w, r, http.StatusOK, []int64{})
	})
}

// SetDescription handles POST /~api/builds/{buildId}/description.
func (h *BuildsHandler) SetDescription(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.SetDescription", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canManageBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, model.BuildMaxDescriptionLen+1))
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid body", err)
		return
	}
	description := string(body)
	if len(description) > model.BuildMaxDescriptionLen {
		op.Fail(errors.New("description too long"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "description too long")
		return
	}
	if err := h.Builds.UpdateDescription(r.Context(), buildID, description); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// Delete handles DELETE /~api/builds/{buildId}.
func (h *BuildsHandler) Delete(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.Delete", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canManageBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if err := h.Builds.Delete(r.Context(), buildID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// Run handles POST /~api/builds/{buildId}/run — Rerun a build.
func (h *BuildsHandler) Run(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.Run", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canManageBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	// Read optional reason from request body.
	var reason string
	if err := decodeJSON(r, &struct {
		Reason *string `json:"reason"`
	}{Reason: &reason}); err != nil {
		// Body may be empty — that's fine.
		reason = "rerun"
	}

	build, err := h.Jobs.Resubmit(r.Context(), buildID, reason)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK, "build_id", build.ID)
	writeJSON(w, r, http.StatusOK, build)
}

// Cancel handles POST /~api/builds/{buildId}/cancel — Cancel a build.
func (h *BuildsHandler) Cancel(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildsHandler.Cancel", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canManageBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	if err := h.Jobs.Cancel(r.Context(), buildID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *BuildsHandler) withBuildAccess(
	w http.ResponseWriter,
	r *http.Request,
	op *OpLog,
	buildID int64,
	fn func(*model.Build),
) bool {
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return false
	}
	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return false
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return false
	}
	if !h.canAccessBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return false
	}
	fn(b)
	return true
}

func (h *BuildsHandler) canAccessBuild(r *http.Request, user *model.User, b *model.Build) bool {
	_ = r
	_ = user
	_ = b
	return true
}

func (h *BuildsHandler) canManageBuild(r *http.Request, user *model.User, b *model.Build) bool {
	if user == nil {
		return false
	}
	if user.ID == model.UserRootID {
		return true
	}
	if b.Submitter != nil && b.Submitter.ID == user.ID {
		return true
	}
	ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, b.ProjectID)
	return ok
}

func (h *BuildsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *BuildsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseBuildID reads the buildId path parameter.
func ParseBuildID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "buildId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid build id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}
