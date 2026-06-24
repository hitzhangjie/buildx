package api

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/codecomment"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// CodeCommentsHandler serves /~api/code-comments and project-scoped listing.
type CodeCommentsHandler struct {
	Comments codeCommentService
	Projects projectService
	Security securityService
}

type codeCommentService interface {
	Create(ctx context.Context, comment *model.CodeComment) (*model.CodeComment, error)
	Get(ctx context.Context, id int64) (*model.CodeComment, error)
	ListByMark(ctx context.Context, projectID int64, commitHash, path string) ([]*model.CodeComment, error)
	Delete(ctx context.Context, id int64) error
}

type createCodeCommentRequest struct {
	ProjectID int64            `json:"projectId"`
	Content   string           `json:"content"`
	Mark      model.Mark       `json:"mark"`
}

// Create handles POST /~api/code-comments.
func (h *CodeCommentsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "CodeCommentsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var req createCodeCommentRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if req.ProjectID == 0 || strings.TrimSpace(req.Content) == "" || req.Mark.Range == nil {
		op.Fail(errors.New("missing fields"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "projectId, content, and mark.range are required")
		return
	}

	proj, err := h.Projects.Get(r.Context(), req.ProjectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if proj == nil {
		op.Fail(errors.New("project not found"), http.StatusNotFound)
		writeNotFound(w, r, "project", "project_id", req.ProjectID)
		return
	}

	comment, err := h.Comments.Create(r.Context(), &model.CodeComment{
		ProjectID: req.ProjectID,
		User:      user,
		Content:   req.Content,
		Mark:      req.Mark,
	})
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusCreated, "comment_id", comment.ID)
	writeJSON(w, r, http.StatusCreated, comment)
}

// Get handles GET /~api/code-comments/{commentId}.
func (h *CodeCommentsHandler) Get(w http.ResponseWriter, r *http.Request, commentID int64) {
	op := StartOp(r, "CodeCommentsHandler.Get", "comment_id", commentID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	comment, err := h.Comments.Get(r.Context(), commentID)
	if err != nil {
		if errors.Is(err, codecomment.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "code-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	if user == nil {
		if ok, _ := h.Security.HasProjectAccess(r.Context(), model.UserRootID, comment.ProjectID); !ok {
			op.Fail(security.ErrUnauthorized, http.StatusUnauthorized)
			writeError(w, r, security.ErrUnauthorized)
			return
		}
	} else if ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, comment.ProjectID); !ok && user.ID != model.UserRootID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, comment)
}

// Delete handles DELETE /~api/code-comments/{commentId}.
func (h *CodeCommentsHandler) Delete(w http.ResponseWriter, r *http.Request, commentID int64) {
	op := StartOp(r, "CodeCommentsHandler.Delete", "comment_id", commentID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	comment, err := h.Comments.Get(r.Context(), commentID)
	if err != nil {
		if errors.Is(err, codecomment.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "code-comment", "comment_id", commentID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	if comment.User == nil || (comment.User.ID != user.ID && user.ID != model.UserRootID) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Comments.Delete(r.Context(), commentID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// ListByFile handles GET /~api/projects/{projectPath}/code-comments?commitHash=&path=
func (h *CodeCommentsHandler) ListByFile(w http.ResponseWriter, r *http.Request, projectPath string) {
	op := StartOp(r, "CodeCommentsHandler.ListByFile")
	projectPath = strings.Trim(projectPath, "/")
	if projectPath == "" {
		writeNotFound(w, r, "project_path")
		return
	}

	commitHash := r.URL.Query().Get("commitHash")
	path := r.URL.Query().Get("path")
	if commitHash == "" || path == "" {
		writeJSONError(w, http.StatusBadRequest, "commitHash and path are required")
		return
	}

	proj, err := h.Projects.GetByPath(r.Context(), projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if proj == nil {
		writeNotFound(w, r, "project", "project_path", projectPath)
		return
	}

	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if user == nil {
		if ok, _ := h.Security.HasProjectAccess(r.Context(), model.UserRootID, proj.ID); !ok {
			op.Fail(security.ErrUnauthorized, http.StatusUnauthorized)
			writeError(w, r, security.ErrUnauthorized)
			return
		}
	} else if ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, proj.ID); !ok && user.ID != model.UserRootID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	comments, err := h.Comments.ListByMark(r.Context(), proj.ID, commitHash, path)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if comments == nil {
		comments = []*model.CodeComment{}
	}

	op.OK(http.StatusOK, "count", len(comments))
	writeJSON(w, r, http.StatusOK, comments)
}

func (h *CodeCommentsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *CodeCommentsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseCommentID reads the commentId path parameter.
func ParseCommentID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	id, err := strconv.ParseInt(chi.URLParam(r, "commentId"), 10, 64)
	if err != nil {
		http.Error(w, "invalid comment id", http.StatusBadRequest)
		return 0, false
	}
	return id, true
}
