package api

import (
	"encoding/json"
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
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return
	}
	_ = user

	projects, err := h.Projects.List(r.Context())
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, projects)
}

func (h *ProjectsHandler) Get(w http.ResponseWriter, r *http.Request, id int64) {
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return
	}
	_ = user

	p, err := h.Projects.Get(r.Context(), id)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	if p == nil {
		http.NotFound(w, r)
		return
	}
	writeJSON(w, http.StatusOK, p)
}

type createProjectRequest struct {
	Name        string `json:"name"`
	Key         string `json:"key"`
	Description string `json:"description"`
	ParentID    *int64 `json:"parentId"`
}

func (h *ProjectsHandler) Create(w http.ResponseWriter, r *http.Request) {
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return
	}

	var req createProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	p, err := h.Projects.Create(r.Context(), user.ID, &project.Project{
		Name:        req.Name,
		Key:         req.Key,
		Description: req.Description,
		ParentID:    req.ParentID,
	})
	if err != nil {
		if errors.Is(err, project.ErrAlreadyExists) || errors.Is(err, project.ErrInvalidName) {
			http.Error(w, err.Error(), http.StatusNotAcceptable)
			return
		}
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, p)
}

type setupProjectRequest struct {
	Path string `json:"path"`
}

func (h *ProjectsHandler) Setup(w http.ResponseWriter, r *http.Request) {
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return
	}

	var req setupProjectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}

	p, err := h.Projects.Setup(r.Context(), user.ID, req.Path)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, p)
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
	if _, err := h.authenticate(r); err != nil {
		writeError(w, err)
		return
	}
	users, err := h.Security.ListUsers(r.Context())
	if err != nil {
		writeInternalError(w, err)
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
	writeJSON(w, http.StatusOK, views)
}

type createUserRequest struct {
	Name     string `json:"name"`
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

func (h *UsersHandler) Create(w http.ResponseWriter, r *http.Request) {
	if !h.allowBootstrap(r) {
		if _, err := h.authenticate(r); err != nil {
			writeError(w, err)
			return
		}
	}
	var req createUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid json", http.StatusBadRequest)
		return
	}
	user, err := h.Security.CreateUser(r.Context(), req.Name, req.FullName, req.Email, req.Password)
	if err != nil {
		writeInternalError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, map[string]any{
		"id":       user.ID,
		"name":     user.Name,
		"fullName": user.FullName,
	})
}

func (h *UsersHandler) Me(w http.ResponseWriter, r *http.Request) {
	user, err := h.authenticate(r)
	if err != nil {
		writeError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
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

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

func writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, security.ErrUnauthorized), errors.Is(err, security.ErrInvalidCredentials):
		w.Header().Set("WWW-Authenticate", `Basic realm="BuildX"`)
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	case errors.Is(err, security.ErrUserDisabled):
		http.Error(w, "user disabled", http.StatusForbidden)
	default:
		writeInternalError(w, err)
	}
}

func writeInternalError(w http.ResponseWriter, err error) {
	http.Error(w, err.Error(), http.StatusInternalServerError)
}
