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
	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const maxIssuePageSize = 500

// IssuesHandler serves OneDev-compatible /~api/issues endpoints.
type IssuesHandler struct {
	Issues   issueStore
	Projects projectService
	Security securityService
}

type issueStore interface {
	Create(ctx context.Context, issue *model.Issue) (*model.Issue, error)
	Get(ctx context.Context, id int64) (*model.Issue, error)
	Query(ctx context.Context, filter issue.QueryFilter, offset, count int) ([]*model.Issue, error)
	UpdateTitle(ctx context.Context, id int64, title string) error
	UpdateDescription(ctx context.Context, id int64, description string) error
	UpdateState(ctx context.Context, id int64, state string) error
	Delete(ctx context.Context, id int64) error
	ListComments(ctx context.Context, issueID int64) ([]*model.IssueComment, error)
	ListIssueIterations(ctx context.Context, issueID int64) ([]*model.Iteration, error)
	SetIssueIterations(ctx context.Context, issueID int64, iterationIDs []int64) error
	ListIssuesByIteration(ctx context.Context, iterationID int64) ([]*model.Issue, error)
	CountIssuesByIterationState(ctx context.Context, iterationID int64) (map[string]int, error)
}

type issueOpenData struct {
	ProjectID     int64   `json:"projectId"`
	Title         string  `json:"title"`
	Description   string  `json:"description"`
	Confidential  bool    `json:"confidential"`
	IterationIDs  []int64 `json:"iterationIds"`
}

type stateTransitionData struct {
	State   string `json:"state"`
	Comment string `json:"comment"`
}

// Get handles GET /~api/issues/{issueId}.
func (h *IssuesHandler) Get(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.Get", "issue_id", issueID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, iss)
}

// Query handles GET /~api/issues.
func (h *IssuesHandler) Query(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IssuesHandler.Query")
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
	if count > maxIssuePageSize {
		op.Fail(errors.New("count too large"), http.StatusNotAcceptable)
		writeJSONError(w, http.StatusNotAcceptable, "count should not be greater than "+strconv.Itoa(maxIssuePageSize))
		return
	}

	filter := issue.ParseQuery(query)
	if projectIDStr := r.URL.Query().Get("projectId"); projectIDStr != "" {
		if id, err := strconv.ParseInt(projectIDStr, 10, 64); err == nil {
			filter.ProjectID = id
		}
	}
	if iterationIDStr := r.URL.Query().Get("iterationId"); iterationIDStr != "" {
		if id, err := strconv.ParseInt(iterationIDStr, 10, 64); err == nil {
			filter.IterationID = id
		}
	}

	issues, err := h.Issues.Query(r.Context(), filter, offset, count)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	var visible []*model.Issue
	for _, iss := range issues {
		if h.canAccessIssue(r, user, iss) {
			visible = append(visible, iss)
		}
	}
	if visible == nil {
		visible = []*model.Issue{}
	}

	op.OK(http.StatusOK, "count", len(visible))
	writeJSON(w, r, http.StatusOK, visible)
}

// Create handles POST /~api/issues. Returns issue id (OneDev-compatible).
func (h *IssuesHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IssuesHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var data issueOpenData
	if err := decodeJSON(r, &data); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if data.ProjectID == 0 || strings.TrimSpace(data.Title) == "" {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "projectId and title are required")
		return
	}

	proj, err := h.Projects.Get(r.Context(), data.ProjectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if proj == nil {
		op.Fail(errors.New("project not found"), http.StatusNotFound)
		writeNotFound(w, r, "project", "project_id", data.ProjectID)
		return
	}
	if ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, data.ProjectID); !ok && user.ID != model.UserRootID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	created, err := h.Issues.Create(r.Context(), &model.Issue{
		ProjectID:    data.ProjectID,
		Title:        data.Title,
		Description:  data.Description,
		Confidential: data.Confidential,
		Submitter:    user,
	})
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}
	if len(data.IterationIDs) > 0 {
		if err := h.Issues.SetIssueIterations(r.Context(), created.ID, data.IterationIDs); err != nil {
			op.Fail(err, http.StatusBadRequest)
			writeJSONError(w, http.StatusBadRequest, err.Error())
			return
		}
	}

	op.OK(http.StatusCreated, "issue_id", created.ID)
	writeJSON(w, r, http.StatusCreated, created.ID)
}

// SetTitle handles POST /~api/issues/{issueId}/title.
func (h *IssuesHandler) SetTitle(w http.ResponseWriter, r *http.Request, issueID int64) {
	h.updateStringField(w, r, issueID, "IssuesHandler.SetTitle", func(ctx context.Context, id int64, value string) error {
		return h.Issues.UpdateTitle(ctx, id, value)
	})
}

// SetDescription handles POST /~api/issues/{issueId}/description.
func (h *IssuesHandler) SetDescription(w http.ResponseWriter, r *http.Request, issueID int64) {
	h.updateStringField(w, r, issueID, "IssuesHandler.SetDescription", func(ctx context.Context, id int64, value string) error {
		return h.Issues.UpdateDescription(ctx, id, value)
	})
}

// ListComments handles GET /~api/issues/{issueId}/comments.
func (h *IssuesHandler) ListComments(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.ListComments", "issue_id", issueID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	comments, err := h.Issues.ListComments(r.Context(), issueID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if comments == nil {
		comments = []*model.IssueComment{}
	}

	op.OK(http.StatusOK, "count", len(comments))
	writeJSON(w, r, http.StatusOK, comments)
}

// ListIterations handles GET /~api/issues/{issueId}/iterations.
func (h *IssuesHandler) ListIterations(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.ListIterations", "issue_id", issueID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	iters, err := h.Issues.ListIssueIterations(r.Context(), issueID)
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

// SetIterations handles POST /~api/issues/{issueId}/iterations.
func (h *IssuesHandler) SetIterations(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.SetIterations", "issue_id", issueID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var iterationIDs []int64
	if err := decodeJSON(r, &iterationIDs); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}

	if err := h.Issues.SetIssueIterations(r.Context(), issueID, iterationIDs); err != nil {
		if errors.Is(err, issue.ErrIterationNotInProject) {
			op.Fail(err, http.StatusNotAcceptable)
			writeJSONError(w, http.StatusNotAcceptable, err.Error())
			return
		}
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// TransitState handles POST /~api/issues/{issueId}/state-transitions.
func (h *IssuesHandler) TransitState(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.TransitState", "issue_id", issueID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var data stateTransitionData
	if err := decodeJSON(r, &data); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if strings.TrimSpace(data.State) == "" {
		op.Fail(errors.New("missing state"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "state is required")
		return
	}

	if err := h.Issues.UpdateState(r.Context(), issueID, data.State); err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// Delete handles DELETE /~api/issues/{issueId}.
func (h *IssuesHandler) Delete(w http.ResponseWriter, r *http.Request, issueID int64) {
	op := StartOp(r, "IssuesHandler.Delete", "issue_id", issueID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Issues.Delete(r.Context(), issueID); err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *IssuesHandler) updateStringField(
	w http.ResponseWriter,
	r *http.Request,
	issueID int64,
	opName string,
	update func(context.Context, int64, string) error,
) {
	op := StartOp(r, opName, "issue_id", issueID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), issueID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyIssue(r, user, iss) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
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

	if err := update(r.Context(), issueID, value); err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", issueID)
			return
		}
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *IssuesHandler) canAccessIssue(r *http.Request, user *model.User, iss *model.Issue) bool {
	if iss.Confidential {
		if user == nil {
			return false
		}
		if user.ID == model.UserRootID || (iss.Submitter != nil && iss.Submitter.ID == user.ID) {
			return true
		}
	}
	uid := model.UserRootID
	if user != nil {
		uid = user.ID
	}
	ok, _ := h.Security.HasProjectAccess(r.Context(), uid, iss.ProjectID)
	return ok
}

func (h *IssuesHandler) canModifyIssue(r *http.Request, user *model.User, iss *model.Issue) bool {
	if user == nil {
		return false
	}
	if user.ID == model.UserRootID {
		return true
	}
	if iss.Submitter != nil && iss.Submitter.ID == user.ID {
		return true
	}
	ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, iss.ProjectID)
	return ok
}

func (h *IssuesHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *IssuesHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseIssueID reads the issueId path parameter.
func ParseIssueID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "issueId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid issue id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}
