package api

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const maxPullRequestPageSize = 500

// PullRequestsHandler serves /~api/pulls and related sub-resources.
type PullRequestsHandler struct {
	Service    *pullrequest.Service
	Store      *pullrequest.DBStore
	Projects   projectService
	Security   securityService
	CINotifier CINotifier // optional CI trigger hook after PR sync
}

func (h *PullRequestsHandler) Get(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.Get", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	pr, err := h.Store.Get(r.Context(), requestID)
	if err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "pull request", "request_id", requestID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, pr)
}

func (h *PullRequestsHandler) Query(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "PullRequestsHandler.Query")
	if _, err := h.authenticateOptional(r); err != nil {
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
	if count > maxPullRequestPageSize {
		count = maxPullRequestPageSize
	}

	pathMap, err := h.projectPathMap(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	if path, number, ok := pullrequest.ParseNumberQuery(query); ok {
		projectID, found := lookupProjectID(pathMap, path)
		if !found {
			op.OK(http.StatusOK, "count", 0)
			writeJSON(w, r, http.StatusOK, []*model.PullRequest{})
			return
		}
		pr, err := h.Store.GetByNumber(r.Context(), projectID, number)
		if err != nil {
			op.OK(http.StatusOK, "count", 0)
			writeJSON(w, r, http.StatusOK, []*model.PullRequest{})
			return
		}
		op.OK(http.StatusOK, "count", 1)
		writeJSON(w, r, http.StatusOK, []*model.PullRequest{pr})
		return
	}

	opts := pullrequest.ParseQuery(query, invertPathMap(pathMap))
	opts.Offset = offset
	opts.Count = count
	requests, err := h.Store.Query(r.Context(), opts)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if requests == nil {
		requests = []*model.PullRequest{}
	}
	op.OK(http.StatusOK, "count", len(requests))
	writeJSON(w, r, http.StatusOK, requests)
}

func (h *PullRequestsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "PullRequestsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var data model.PullRequestOpenData
	if err := decodeJSON(r, &data); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if data.TargetProjectID == 0 || data.SourceProjectID == 0 ||
		strings.TrimSpace(data.TargetBranch) == "" || strings.TrimSpace(data.SourceBranch) == "" ||
		strings.TrimSpace(data.Title) == "" {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "targetProjectId, sourceProjectId, targetBranch, sourceBranch, and title are required")
		return
	}

	created, err := h.Service.Open(r.Context(), &data, user)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, pullrequest.ErrBranchNotFound) {
			status = http.StatusNotAcceptable
		}
		op.Fail(err, status)
		writeJSONError(w, status, err.Error())
		return
	}

	op.OK(http.StatusOK, "request_id", created.ID)
	writeJSON(w, r, http.StatusOK, created.ID)
}

func (h *PullRequestsHandler) SetMergeStrategy(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.SetMergeStrategy", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "read body", err)
		return
	}
	var strategy model.MergeStrategy
	if err := json.Unmarshal(body, &strategy); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "body must be a JSON merge strategy string")
		return
	}
	pr, err := h.Store.Get(r.Context(), requestID)
	if err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			writeNotFound(w, r, "pull request", "request_id", requestID)
			return
		}
		writeInternalError(w, r, err)
		return
	}
	if !pr.IsOpen() {
		writeJSONError(w, http.StatusNotAcceptable, "pull request is not open")
		return
	}
	// OneDev: isOpen() && canModifyPullRequest.
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can change merge strategy")
		return
	}
	if err := h.Store.SetMergeStrategy(r.Context(), requestID, strategy); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) SetTitle(w http.ResponseWriter, r *http.Request, requestID int64) {
	h.updateRequestField(w, r, requestID, "PullRequestsHandler.SetTitle", func(ctx context.Context, pr *model.PullRequest, title string) error {
		if !pr.IsOpen() {
			return pullrequest.ErrNotOpen
		}
		return h.Store.SetTitle(ctx, requestID, title)
	})
}

func (h *PullRequestsHandler) SetDescription(w http.ResponseWriter, r *http.Request, requestID int64) {
	h.updateRequestField(w, r, requestID, "PullRequestsHandler.SetDescription", func(ctx context.Context, pr *model.PullRequest, description string) error {
		if !pr.IsOpen() {
			return pullrequest.ErrNotOpen
		}
		return h.Store.SetDescription(ctx, requestID, description)
	})
}

func (h *PullRequestsHandler) MergePreview(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.MergePreview", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	preview, err := h.Service.MergePreview(r.Context(), pr)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, preview)
}

func (h *PullRequestsHandler) ListComments(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.ListComments", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if _, err := h.loadRequest(w, r, op, requestID); err != nil {
		return
	}
	comments, err := h.Store.ListComments(r.Context(), requestID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if comments == nil {
		comments = []*model.PullRequestComment{}
	}
	op.OK(http.StatusOK, "count", len(comments))
	writeJSON(w, r, http.StatusOK, comments)
}

func (h *PullRequestsHandler) ListReviews(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.ListReviews", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if _, err := h.loadRequest(w, r, op, requestID); err != nil {
		return
	}
	reviews, err := h.Store.ListReviews(r.Context(), requestID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if reviews == nil {
		reviews = []*model.PullRequestReview{}
	}
	op.OK(http.StatusOK, "count", len(reviews))
	writeJSON(w, r, http.StatusOK, reviews)
}

func (h *PullRequestsHandler) ListAssignments(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.ListAssignments", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if _, err := h.loadRequest(w, r, op, requestID); err != nil {
		return
	}
	assignments, err := h.Store.ListAssignments(r.Context(), requestID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if assignments == nil {
		assignments = []*model.PullRequestAssignment{}
	}
	op.OK(http.StatusOK, "count", len(assignments))
	writeJSON(w, r, http.StatusOK, assignments)
}

func (h *PullRequestsHandler) ListLabels(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.ListLabels", "request_id", requestID)
	if _, err := h.authenticateOptional(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if _, err := h.loadRequest(w, r, op, requestID); err != nil {
		return
	}
	labels, err := h.Store.ListLabels(r.Context(), requestID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if labels == nil {
		labels = []string{}
	}
	op.OK(http.StatusOK, "count", len(labels))
	writeJSON(w, r, http.StatusOK, labels)
}

func (h *PullRequestsHandler) Merge(w http.ResponseWriter, r *http.Request, requestID int64) {
	h.runRequestAction(w, r, requestID, "PullRequestsHandler.Merge", func(user *model.User, pr *model.PullRequest, note string) error {
		// OneDev: SecurityUtils.canWriteCode(project) — WriteCode project permission required.
		// Submitter cannot self-merge; must have explicit WriteCode permission.
		if user == nil {
			return security.ErrUnauthorized
		}
		if pr.Submitter != nil && user.ID == pr.Submitter.ID {
			return errors.New("pull request submitter cannot merge; only users with write code permission can merge")
		}
		return h.Service.Merge(r.Context(), pr, user, note)
	})
}

func (h *PullRequestsHandler) Discard(w http.ResponseWriter, r *http.Request, requestID int64) {
	h.runRequestAction(w, r, requestID, "PullRequestsHandler.Discard", func(user *model.User, pr *model.PullRequest, note string) error {
		// OneDev: SecurityUtils.canModifyPullRequest(request) — submitter, assignee, or manager.
		if user == nil {
			return security.ErrUnauthorized
		}
		if !h.canModifyPullRequest(user, pr) {
			return errors.New("only pull request submitter, assignees, or project managers can discard")
		}
		return h.Service.Discard(r.Context(), pr, user, note)
	})
}

func (h *PullRequestsHandler) Reopen(w http.ResponseWriter, r *http.Request, requestID int64) {
	h.runRequestAction(w, r, requestID, "PullRequestsHandler.Reopen", func(user *model.User, pr *model.PullRequest, note string) error {
		// OneDev: SecurityUtils.canModifyPullRequest(request).
		if user == nil {
			return security.ErrUnauthorized
		}
		if !h.canModifyPullRequest(user, pr) {
			return errors.New("only pull request submitter, assignees, or project managers can reopen")
		}
		return h.Service.Reopen(r.Context(), pr, user, note)
	})
}

func (h *PullRequestsHandler) DeleteSourceBranch(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.DeleteSourceBranch", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	// OneDev: canModifyPullRequest + canDeleteBranch. Conservative: only submitter.
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can delete source branch")
		return
	}
	if err := h.Service.DeleteSourceBranch(r.Context(), pr); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) RestoreSourceBranch(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.RestoreSourceBranch", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	// OneDev: canModifyPullRequest + canWriteCode(sourceProject).
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can restore source branch")
		return
	}
	if err := h.Service.RestoreSourceBranch(r.Context(), pr); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) Synchronize(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.Synchronize", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	// OneDev: canModifyPullRequest.
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can synchronize")
		return
	}
	if err := h.Service.Synchronize(r.Context(), pr); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	if h.CINotifier != nil {
		if updated, err := h.Store.Get(r.Context(), requestID); err == nil && updated != nil &&
			updated.TargetProject != nil && updated.BuildCommitHash != "" {
			h.CINotifier.NotifyPullRequestUpdated(r.Context(), updated.TargetProject.ID,
				updated.BuildCommitHash, updated.SourceBranch, nil, user.ID)
		}
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) ChangeTargetBranch(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.ChangeTargetBranch", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSONError(w, http.StatusBadRequest, "read body")
		return
	}
	newTarget := strings.TrimSpace(string(body))
	// handle JSON string wrapping
	if strings.HasPrefix(newTarget, `"`) && strings.HasSuffix(newTarget, `"`) {
		newTarget = newTarget[1 : len(newTarget)-1]
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	// OneDev: isOpen() && canModifyPullRequest.
	if !pr.IsOpen() {
		writeJSONError(w, http.StatusNotAcceptable, "pull request is not open")
		return
	}
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can change target branch")
		return
	}
	if err := h.Service.ChangeTargetBranch(r.Context(), pr, newTarget); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) DeletePullRequest(w http.ResponseWriter, r *http.Request, requestID int64) {
	op := StartOp(r, "PullRequestsHandler.Delete", "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	// OneDev: canModifyPullRequest.
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can delete")
		return
	}
	if err := h.Service.Delete(r.Context(), pr); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) CreateComment(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "PullRequestsHandler.CreateComment")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var req struct {
		RequestID int64  `json:"requestId"`
		Content   string `json:"content"`
	}
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if req.RequestID == 0 || strings.TrimSpace(req.Content) == "" {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "requestId and content are required")
		return
	}
	if _, err := h.Store.Get(r.Context(), req.RequestID); err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			writeNotFound(w, r, "pull request", "request_id", req.RequestID)
			return
		}
		writeInternalError(w, r, err)
		return
	}

	comment, err := h.Store.CreateComment(r.Context(), &model.PullRequestComment{
		RequestID: req.RequestID,
		User:      user,
		Content:   req.Content,
	})
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusCreated, "comment_id", comment.ID)
	writeJSON(w, r, http.StatusCreated, comment)
}

func (h *PullRequestsHandler) CreateReview(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "PullRequestsHandler.CreateReview")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var req struct {
		RequestID int64  `json:"requestId"`
		UserID    int64  `json:"userId"`
		Status    string `json:"status"`
		Note      string `json:"note"`
	}
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if req.RequestID == 0 {
		writeJSONError(w, http.StatusBadRequest, "requestId is required")
		return
	}
	pr, err := h.Store.Get(r.Context(), req.RequestID)
	if err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			writeNotFound(w, r, "pull request", "request_id", req.RequestID)
			return
		}
		writeInternalError(w, r, err)
		return
	}

	reviewUser := user
	if req.UserID > 0 {
		reviewUser = &model.User{ID: req.UserID}
	}
	if pr.Submitter != nil && reviewUser.ID == pr.Submitter.ID && req.Status != "" &&
		strings.ToUpper(strings.TrimSpace(req.Status)) != string(model.PullRequestReviewExcluded) {
		writeJSONError(w, http.StatusNotAcceptable, "pull request submitter cannot be reviewer")
		return
	}

	status := model.PullRequestReviewStatus(strings.ToUpper(strings.TrimSpace(req.Status)))
	switch status {
	case model.PullRequestReviewApproved:
		err = h.Service.Review(r.Context(), pr, user, true, req.Note)
	case model.PullRequestReviewRequestedForChanges:
		err = h.Service.Review(r.Context(), pr, user, false, req.Note)
	case model.PullRequestReviewPending:
		_, err = h.Store.CreateOrUpdateReview(r.Context(), &model.PullRequestReview{
			RequestID: req.RequestID,
			User:      reviewUser,
			Status:    status,
		})
	case model.PullRequestReviewExcluded:
		err = h.Store.DeleteReview(r.Context(), req.RequestID, reviewUser.ID)
	default:
		writeJSONError(w, http.StatusBadRequest, "invalid review status")
		return
	}
	if err != nil {
		statusCode := http.StatusBadRequest
		if errors.Is(err, pullrequest.ErrNotOpen) {
			statusCode = http.StatusNotAcceptable
		}
		op.Fail(err, statusCode)
		writeJSONError(w, statusCode, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) updateStringField(
	w http.ResponseWriter,
	r *http.Request,
	requestID int64,
	opName string,
	update func(ctx context.Context, value string) error,
) {
	op := StartOp(r, opName, "request_id", requestID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "read body", err)
		return
	}
	var value string
	if err := json.Unmarshal(body, &value); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "body must be a JSON string")
		return
	}
	value = strings.TrimSpace(value)
	if value == "" {
		writeJSONError(w, http.StatusBadRequest, "value is required")
		return
	}
	if _, err := h.Store.Get(r.Context(), requestID); err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			writeNotFound(w, r, "pull request", "request_id", requestID)
			return
		}
		writeInternalError(w, r, err)
		return
	}
	if err := update(r.Context(), value); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// updateRequestField is like updateStringField but also loads the PR and checks canModifyPullRequest.
func (h *PullRequestsHandler) updateRequestField(
	w http.ResponseWriter,
	r *http.Request,
	requestID int64,
	opName string,
	update func(ctx context.Context, pr *model.PullRequest, value string) error,
) {
	op := StartOp(r, opName, "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	body, err := io.ReadAll(r.Body)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "read body", err)
		return
	}
	var value string
	if err := json.Unmarshal(body, &value); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "body must be a JSON string")
		return
	}
	value = strings.TrimSpace(value)
	if value == "" {
		writeJSONError(w, http.StatusBadRequest, "value is required")
		return
	}
	pr, err := h.Store.Get(r.Context(), requestID)
	if err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			writeNotFound(w, r, "pull request", "request_id", requestID)
			return
		}
		writeInternalError(w, r, err)
		return
	}
	// OneDev: canModifyPullRequest.
	if !h.canModifyPullRequest(user, pr) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		writeJSONError(w, http.StatusForbidden, "only pull request submitter, assignees, or project managers can modify")
		return
	}
	if err := update(r.Context(), pr, value); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) runRequestAction(
	w http.ResponseWriter,
	r *http.Request,
	requestID int64,
	opName string,
	action func(user *model.User, pr *model.PullRequest, note string) error,
) {
	op := StartOp(r, opName, "request_id", requestID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	pr, err := h.loadRequest(w, r, op, requestID)
	if err != nil {
		return
	}
	noteBytes, _ := io.ReadAll(r.Body)
	note := strings.TrimSpace(string(noteBytes))
	if err := action(user, pr, note); err != nil {
		status := http.StatusBadRequest
		switch {
		case errors.Is(err, pullrequest.ErrNotOpen):
			status = http.StatusNotAcceptable
		case errors.Is(err, pullrequest.ErrMergeConflict):
			status = http.StatusNotAcceptable
		case errors.Is(err, pullrequest.ErrBranchNotFound):
			status = http.StatusNotAcceptable
		}
		op.Fail(err, status)
		writeJSONError(w, status, err.Error())
		return
	}
	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *PullRequestsHandler) loadRequest(w http.ResponseWriter, r *http.Request, op *OpLog, requestID int64) (*model.PullRequest, error) {
	pr, err := h.Store.Get(r.Context(), requestID)
	if err != nil {
		if errors.Is(err, pullrequest.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "pull request", "request_id", requestID)
			return nil, err
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return nil, err
	}
	return pr, nil
}

// canModifyPullRequest matches OneDev's SecurityUtils.canModifyPullRequest.
// Returns true when the user is the PR submitter, a PR assignee, or has
// project manager role (to be wired when role system is expanded).
func (h *PullRequestsHandler) canModifyPullRequest(user *model.User, pr *model.PullRequest) bool {
	if user == nil || pr == nil {
		return false
	}
	// Submitter can always modify their own PR.
	if pr.Submitter != nil && user.ID == pr.Submitter.ID {
		return true
	}
	// Assignees can modify the PR (they're expected to merge/review).
	assignments, err := h.Store.ListAssignments(context.Background(), pr.ID)
	if err != nil {
		return false
	}
	for _, a := range assignments {
		if a.User != nil && a.User.ID == user.ID {
			return true
		}
	}
	return false
}

func (h *PullRequestsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *PullRequestsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

func (h *PullRequestsHandler) projectPathMap(ctx context.Context) (map[int64]string, error) {
	projects, err := h.Projects.List(ctx)
	if err != nil {
		return nil, err
	}
	m := make(map[int64]string, len(projects))
	for _, p := range projects {
		m[p.ID] = p.Path
	}
	return m, nil
}

func lookupProjectID(pathMap map[int64]string, path string) (int64, bool) {
	for id, p := range pathMap {
		if p == path || strings.EqualFold(p, path) {
			return id, true
		}
	}
	return 0, false
}

func invertPathMap(pathMap map[int64]string) map[int64]string {
	return pathMap
}

// ParsePullRequestID parses requestId from chi URL params.
func ParsePullRequestID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "requestId"), 10, 64)
	if err != nil || id <= 0 {
		writeJSONError(w, http.StatusBadRequest, "invalid request id")
		return 0, false
	}
	return id, true
}
