package api

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// JobRunHandler handles build submission, rerun, and cancellation.
// Maps to OneDev's JobRunResource.java.
type JobRunHandler struct {
	Jobs     JobService
	Builds   buildStore
	Projects projectService
	Security securityService
}

// JobService defines the interface for build job lifecycle operations.
type JobService interface {
	Submit(ctx context.Context, req SubmitRequest) (*model.Build, error)
	Resubmit(ctx context.Context, buildID int64, reason string) (*model.Build, error)
	Cancel(ctx context.Context, buildID int64) error
	Pause(ctx context.Context, buildID int64) error
	Resume(ctx context.Context, buildID int64) error
}

// SubmitRequest mirrors job.SubmitRequest.
type SubmitRequest struct {
	ProjectID   int64               `json:"projectId"`
	CommitHash  string              `json:"commitHash"`
	JobName     string              `json:"jobName"`
	RefName     string              `json:"refName"`
	Params      map[string][]string `json:"params,omitempty"`
	Reason      string              `json:"reason,omitempty"`
	PRID        int64               `json:"pullRequestId,omitempty"`
	IssueID     int64               `json:"issueId,omitempty"`
	SubmitterID int64               `json:"-"` // set from authenticated user, not request body
}

// RerunRequest is the body for rebuild requests.
type RerunRequest struct {
	BuildID int64  `json:"buildId"`
	Reason  string `json:"reason"`
}

// SubmitBuild handles POST /~api/job-runs — Submit a new build.
func (h *JobRunHandler) SubmitBuild(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "JobRunHandler.SubmitBuild")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	var req SubmitRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("project_id", req.ProjectID, "job_name", req.JobName, "ref", req.RefName)

	if req.ProjectID == 0 {
		op.Fail(errors.New("projectId required"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "projectId is required")
		return
	}
	if req.JobName == "" {
		op.Fail(errors.New("jobName required"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "jobName is required")
		return
	}
	req.SubmitterID = user.ID

	build, err := h.Jobs.Submit(r.Context(), req)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusCreated, "build_id", build.ID)
	writeJSON(w, r, http.StatusCreated, build)
}

// Rebuild handles POST /~api/job-runs/rebuild — Rerun a build.
func (h *JobRunHandler) Rebuild(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "JobRunHandler.Rebuild")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	var req RerunRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("build_id", req.BuildID, "reason", req.Reason)

	build, err := h.Jobs.Resubmit(r.Context(), req.BuildID, req.Reason)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK, "build_id", build.ID)
	writeJSON(w, r, http.StatusOK, build)
}

// CancelBuild handles DELETE /~api/job-runs/{buildId} — Cancel a running build.
func (h *JobRunHandler) CancelBuild(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "JobRunHandler.CancelBuild", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

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

// PauseBuild handles POST /~api/job-runs/{buildId}/pause — Pause a running build.
func (h *JobRunHandler) PauseBuild(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "JobRunHandler.PauseBuild", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	if err := h.Jobs.Pause(r.Context(), buildID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

// ResumeBuild handles POST /~api/job-runs/{buildId}/resume — Resume a paused build.
func (h *JobRunHandler) ResumeBuild(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "JobRunHandler.ResumeBuild", "build_id", buildID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Jobs == nil {
		op.Fail(errors.New("job service not available"), http.StatusNotImplemented)
		http.Error(w, "job service not available", http.StatusNotImplemented)
		return
	}

	if err := h.Jobs.Resume(r.Context(), buildID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *JobRunHandler) authenticate(r *http.Request) (*model.User, error) {
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
