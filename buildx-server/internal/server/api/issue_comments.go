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

// IssueCommentsHandler serves /~api/issue-comments endpoints.
type IssueCommentsHandler struct {
	Issues   issueCommentStore
	Security securityService
}

type issueCommentStore interface {
	Get(ctx context.Context, id int64) (*model.Issue, error)
	GetComment(ctx context.Context, id int64) (*model.IssueComment, error)
	CreateComment(ctx context.Context, comment *model.IssueComment) (*model.IssueComment, error)
	UpdateComment(ctx context.Context, id int64, content string) error
	DeleteComment(ctx context.Context, id int64) error
}

type createIssueCommentRequest struct {
	Issue *struct {
		ID int64 `json:"id"`
	} `json:"issue"`
	User    *model.User `json:"user"`
	Content string      `json:"content"`
}

// Get handles GET /~api/issue-comments/{commentId}.
func (h *IssueCommentsHandler) Get(w http.ResponseWriter, r *http.Request, commentID int64) {
	op := StartOp(r, "IssueCommentsHandler.Get", "comment_id", commentID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	comment, err := h.Issues.GetComment(r.Context(), commentID)
	if err != nil {
		if errors.Is(err, issue.ErrCommentNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	iss, err := h.Issues.Get(r.Context(), comment.IssueID)
	if err != nil {
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
	writeJSON(w, r, http.StatusOK, comment)
}

// Create handles POST /~api/issue-comments. Returns comment id (OneDev-compatible).
func (h *IssueCommentsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IssueCommentsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var req createIssueCommentRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if req.Issue == nil || req.Issue.ID == 0 || strings.TrimSpace(req.Content) == "" {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "issue.id and content are required")
		return
	}

	iss, err := h.Issues.Get(r.Context(), req.Issue.ID)
	if err != nil {
		if errors.Is(err, issue.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue", "issue_id", req.Issue.ID)
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

	commentUser := user
	if req.User != nil && req.User.ID != 0 && user.ID == model.UserRootID {
		commentUser = req.User
	}

	created, err := h.Issues.CreateComment(r.Context(), &model.IssueComment{
		IssueID: req.Issue.ID,
		User:    commentUser,
		Content: req.Content,
	})
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusCreated, "comment_id", created.ID)
	writeJSON(w, r, http.StatusCreated, created.ID)
}

// Update handles POST /~api/issue-comments/{commentId}.
func (h *IssueCommentsHandler) Update(w http.ResponseWriter, r *http.Request, commentID int64) {
	op := StartOp(r, "IssueCommentsHandler.Update", "comment_id", commentID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	comment, err := h.Issues.GetComment(r.Context(), commentID)
	if err != nil {
		if errors.Is(err, issue.ErrCommentNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyComment(user, comment) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	body, err := readJSONStringBody(r)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "body must be a JSON string")
		return
	}

	if err := h.Issues.UpdateComment(r.Context(), commentID, body); err != nil {
		if errors.Is(err, issue.ErrCommentNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// Delete handles DELETE /~api/issue-comments/{commentId}.
func (h *IssueCommentsHandler) Delete(w http.ResponseWriter, r *http.Request, commentID int64) {
	op := StartOp(r, "IssueCommentsHandler.Delete", "comment_id", commentID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	comment, err := h.Issues.GetComment(r.Context(), commentID)
	if err != nil {
		if errors.Is(err, issue.ErrCommentNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canModifyComment(user, comment) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Issues.DeleteComment(r.Context(), commentID); err != nil {
		if errors.Is(err, issue.ErrCommentNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "issue-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *IssueCommentsHandler) canAccessIssue(r *http.Request, user *model.User, iss *model.Issue) bool {
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

func (h *IssueCommentsHandler) canModifyComment(user *model.User, comment *model.IssueComment) bool {
	if user == nil {
		return false
	}
	if user.ID == model.UserRootID {
		return true
	}
	return comment.User != nil && comment.User.ID == user.ID
}

func (h *IssueCommentsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *IssueCommentsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseIssueCommentID reads the commentId path parameter for issue comments.
func ParseIssueCommentID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "commentId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}

func readJSONStringBody(r *http.Request) (string, error) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		return "", err
	}
	var value string
	if err := json.Unmarshal(body, &value); err != nil {
		return "", err
	}
	return value, nil
}
