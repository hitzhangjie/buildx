package api

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/workspace"
)

const maxWorkspacePageSize = 500

// WorkspacesHandler serves OneDev-compatible workspace API endpoints.
type WorkspacesHandler struct {
	Workspaces workspaceStore
	Projects   projectService
	Security   securityService
}

type workspaceStore interface {
	Create(ctx context.Context, ws *model.Workspace) (*model.Workspace, error)
	Get(ctx context.Context, id int64) (*model.Workspace, error)
	GetByNumber(ctx context.Context, projectID int64, number int64) (*model.Workspace, error)
	Query(ctx context.Context, opts workspace.QueryOptions) ([]*model.Workspace, int64, error)
	UpdateStatus(ctx context.Context, id int64, status model.WorkspaceStatus) error
	Delete(ctx context.Context, id int64) error
	CountByProjectTotal(ctx context.Context, projectID int64) (int64, error)
}

type workspaceCreateData struct {
	ProjectID   int64  `json:"projectId"`
	Branch      string `json:"branch"`
	CommitHash  string `json:"commitHash"`
	SpecName    string `json:"specName"`
}

// Query handles GET /~api/workspaces (global list across projects).
func (h *WorkspacesHandler) Query(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "WorkspacesHandler.Query")
	_, err := h.authenticateOptional(r)
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
	if count > maxWorkspacePageSize {
		op.Fail(errors.New("count too large"), http.StatusNotAcceptable)
		writeJSONError(w, http.StatusNotAcceptable, "count should not be greater than "+strconv.Itoa(maxWorkspacePageSize))
		return
	}

	statusFilter := r.URL.Query().Get("status")

	workspaces, total, err := h.Workspaces.Query(r.Context(), workspace.QueryOptions{
		Query:  query,
		Status: statusFilter,
		Offset: offset,
		Count:  count,
	})
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if workspaces == nil {
		workspaces = []*model.Workspace{}
	}

	_ = total
	op.OK(http.StatusOK, "count", len(workspaces))
	writeJSON(w, r, http.StatusOK, workspaces)
}

// QueryByProject handles GET /~api/projects/{projectId}/workspaces.
func (h *WorkspacesHandler) QueryByProject(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "WorkspacesHandler.QueryByProject", "project_id", projectID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	// Verify project exists and user has access
	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil || proj == nil {
		op.Fail(errors.New("project not found"), http.StatusNotFound)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}
	if user != nil && user.ID != model.UserRootID {
		ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, projectID)
		if !ok {
			op.Fail(security.ErrUnauthorized, http.StatusForbidden)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}

	query := r.URL.Query().Get("query")
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	count, _ := strconv.Atoi(r.URL.Query().Get("count"))
	if count <= 0 {
		count = 100
	}
	if count > maxWorkspacePageSize {
		op.Fail(errors.New("count too large"), http.StatusNotAcceptable)
		writeJSONError(w, http.StatusNotAcceptable, "count should not be greater than "+strconv.Itoa(maxWorkspacePageSize))
		return
	}

	statusFilter := r.URL.Query().Get("status")
	branchFilter := r.URL.Query().Get("branch")
	specFilter := r.URL.Query().Get("spec")

	workspaces, total, err := h.Workspaces.Query(r.Context(), workspace.QueryOptions{
		ProjectID: projectID,
		Query:     query,
		Status:    statusFilter,
		Branch:    branchFilter,
		SpecName:  specFilter,
		Offset:    offset,
		Count:     count,
	})
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if workspaces == nil {
		workspaces = []*model.Workspace{}
	}

	_ = total
	op.OK(http.StatusOK, "count", len(workspaces))
	writeJSON(w, r, http.StatusOK, workspaces)
}

// Create handles POST /~api/projects/{projectId}/workspaces.
func (h *WorkspacesHandler) Create(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "WorkspacesHandler.Create", "project_id", projectID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var data workspaceCreateData
	if err := decodeJSON(r, &data); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	data.ProjectID = projectID

	if strings.TrimSpace(data.SpecName) == "" {
		op.Fail(errors.New("missing specName"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "specName is required")
		return
	}
	if strings.TrimSpace(data.Branch) == "" && strings.TrimSpace(data.CommitHash) == "" {
		op.Fail(errors.New("missing branch or commitHash"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "branch or commitHash is required")
		return
	}

	// Verify project exists
	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil || proj == nil {
		op.Fail(errors.New("project not found"), http.StatusNotFound)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}

	// Permission check
	if user.ID != model.UserRootID {
		ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, projectID)
		if !ok {
			op.Fail(security.ErrUnauthorized, http.StatusForbidden)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}

	commitHash := data.CommitHash
	if commitHash == "" {
		commitHash = "0000000000000000000000000000000000000000" // zero hash, resolved server-side
	}

	created, err := h.Workspaces.Create(r.Context(), &model.Workspace{
		NumberScopeID: projectID,
		ProjectID:     projectID,
		UserID:        user.ID,
		SpecName:      data.SpecName,
		Branch:        data.Branch,
		CommitHash:    commitHash,
		Status:        model.WorkspaceStatusPending,
	})
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, err.Error())
		return
	}

	op.OK(http.StatusCreated, "workspace_id", created.ID, "workspace_number", created.Number)
	writeJSON(w, r, http.StatusCreated, created)
}

// Get handles GET /~api/projects/{projectId}/workspaces/{workspaceNumber}.
func (h *WorkspacesHandler) Get(w http.ResponseWriter, r *http.Request, projectID int64, workspaceNumber int64) {
	op := StartOp(r, "WorkspacesHandler.Get", "project_id", projectID, "workspace_number", workspaceNumber)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	// Verify project exists and user has access
	proj, err := h.Projects.Get(r.Context(), projectID)
	if err != nil || proj == nil {
		op.Fail(errors.New("project not found"), http.StatusNotFound)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}
	if user != nil && user.ID != model.UserRootID {
		ok, _ := h.Security.HasProjectAccess(r.Context(), user.ID, projectID)
		if !ok {
			op.Fail(security.ErrUnauthorized, http.StatusForbidden)
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
	}
	_ = proj

	ws, err := h.Workspaces.GetByNumber(r.Context(), projectID, workspaceNumber)
	if err != nil {
		if errors.Is(err, workspace.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "workspace", "workspace_number", workspaceNumber)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, ws)
}

// Delete handles DELETE /~api/projects/{projectId}/workspaces/{workspaceNumber}.
func (h *WorkspacesHandler) Delete(w http.ResponseWriter, r *http.Request, projectID int64, workspaceNumber int64) {
	op := StartOp(r, "WorkspacesHandler.Delete", "project_id", projectID, "workspace_number", workspaceNumber)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ws, err := h.Workspaces.GetByNumber(r.Context(), projectID, workspaceNumber)
	if err != nil {
		if errors.Is(err, workspace.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "workspace", "workspace_number", workspaceNumber)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	// Only workspace creator or root can delete
	if user.ID != model.UserRootID && user.ID != ws.UserID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Workspaces.Delete(r.Context(), ws.ID); err != nil {
		if errors.Is(err, workspace.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "workspace", "workspace_number", workspaceNumber)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

// Reset handles POST /~api/projects/{projectId}/workspaces/{workspaceNumber}/reset (reprovision).
func (h *WorkspacesHandler) Reset(w http.ResponseWriter, r *http.Request, projectID int64, workspaceNumber int64) {
	op := StartOp(r, "WorkspacesHandler.Reset", "project_id", projectID, "workspace_number", workspaceNumber)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ws, err := h.Workspaces.GetByNumber(r.Context(), projectID, workspaceNumber)
	if err != nil {
		if errors.Is(err, workspace.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "workspace", "workspace_number", workspaceNumber)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	// Only workspace creator or root can reset
	if user.ID != model.UserRootID && user.ID != ws.UserID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	// Reset to PENDING status
	if err := h.Workspaces.UpdateStatus(r.Context(), ws.ID, model.WorkspaceStatusPending); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *WorkspacesHandler) authenticate(r *http.Request) (*model.User, error) {
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

func (h *WorkspacesHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

// ParseWorkspaceNumber reads the workspaceNumber path parameter from a project-scoped URL.
func ParseWorkspaceNumber(w http.ResponseWriter, r *http.Request) (int64, bool) {
	num, err := strconv.ParseInt(chi.URLParam(r, "workspaceNumber"), 10, 64)
	if err != nil || num <= 0 {
		writeJSONError(w, http.StatusBadRequest, "invalid workspace number")
		return 0, false
	}
	return num, true
}
