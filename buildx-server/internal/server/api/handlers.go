package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// ProjectsHandler serves OneDev-compatible /~api/projects endpoints.
type ProjectsHandler struct {
	Projects *project.DBStore
	Security *security.DBStore
}

func (h *ProjectsHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "ProjectsHandler.List")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	projects, err := h.Projects.List(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if projects == nil {
		projects = []*project.Project{}
	}
	op.OK(http.StatusOK, "count", len(projects))
	writeJSON(w, r, http.StatusOK, projects)
}

func (h *ProjectsHandler) Get(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "ProjectsHandler.Get", "project_id", id)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	p, err := h.Projects.Get(r.Context(), id)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if p == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", id)
		return
	}
	op.OK(http.StatusOK, "project_key", p.Key)
	writeJSON(w, r, http.StatusOK, p)
}

type createProjectRequest struct {
	Name        string `json:"name"`
	Key         string `json:"key"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parentId"`
}

func (h *ProjectsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "ProjectsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	var req createProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("name", req.Name, "key", req.Key, "parent_id", req.ParentID)

	p, err := h.Projects.Create(r.Context(), user.ID, &project.Project{
		Name:        req.Name,
		Key:         req.Key,
		Description: req.Description,
		ParentID:    req.ParentID,
	})
	if err != nil {
		if errors.Is(err, project.ErrAlreadyExists) || errors.Is(err, project.ErrInvalidName) {
			op.Fail(err, http.StatusNotAcceptable)
			http.Error(w, err.Error(), http.StatusNotAcceptable)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusCreated, "project_id", p.ID, "project_key", p.Key)
	writeJSON(w, r, http.StatusCreated, p)
}

type setupProjectRequest struct {
	Path string `json:"path"`
}

func (h *ProjectsHandler) Setup(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "ProjectsHandler.Setup")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	var req setupProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("path", req.Path)

	p, err := h.Projects.Setup(r.Context(), user.ID, req.Path)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "project_id", p.ID, "project_key", p.Key)
	writeJSON(w, r, http.StatusOK, p)
}

func (h *ProjectsHandler) authenticate(r *http.Request) (*security.User, error) {
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

// UsersHandler serves /~api/users endpoints.
type UsersHandler struct {
	Security *security.DBStore
}

func (h *UsersHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "UsersHandler.List")
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	users, err := h.Security.ListUsers(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	type userView struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		FullName string `json:"fullName"`
	}
	views := make([]userView, 0, len(users))
	for _, u := range users {
		views = append(views, userView{ID: u.ID, Name: u.Name, FullName: u.FullName})
	}
	if views == nil {
		views = []userView{}
	}
	op.OK(http.StatusOK, "count", len(views))
	writeJSON(w, r, http.StatusOK, views)
}

type createUserRequest struct {
	Name     string `json:"name"`
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UsersHandler) Create(w http.ResponseWriter, r *http.Request) {
	bootstrap := h.allowBootstrap(r)
	op := StartOp(r, "UsersHandler.Create", "bootstrap", bootstrap)
	if !bootstrap {
		if _, err := h.authenticate(r); err != nil {
			op.Fail(err, http.StatusUnauthorized)
			writeError(w, r, err)
			return
		}
	}

	var req createUserRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("name", req.Name, "email", req.Email)

	user, err := h.Security.CreateUser(r.Context(), req.Name, req.FullName, req.Email, req.Password)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusCreated, "user_id", user.ID, "user_name", user.Name)
	writeJSON(w, r, http.StatusCreated, map[string]any{
		"id":       user.ID,
		"name":     user.Name,
		"fullName": user.FullName,
	})
}

func (h *UsersHandler) Me(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "UsersHandler.Me")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "user_id", user.ID, "user_name", user.Name)
	writeJSON(w, r, http.StatusOK, map[string]any{
		"id":       user.ID,
		"name":     user.Name,
		"fullName": user.FullName,
	})
}

func (h *UsersHandler) authenticate(r *http.Request) (*security.User, error) {
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

func (h *UsersHandler) allowBootstrap(r *http.Request) bool {
	hasUser, err := h.Security.HasLoginUser(r.Context())
	if err != nil {
		return false
	}
	return !hasUser
}
