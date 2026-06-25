package api

import (
	"errors"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const sessionCookieName = "buildx-session"

// AuthHandler serves login and logout endpoints.
type AuthHandler struct {
	Security securityService
}

type loginRequest struct {
	UserName   string `json:"userName"`
	Password   string `json:"password"`
	RememberMe bool   `json:"rememberMe"`
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "AuthHandler.Login")

	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("userName", req.UserName, "rememberMe", req.RememberMe)

	if req.UserName == "" || req.Password == "" {
		op.Fail(errors.New("missing credentials"), http.StatusBadRequest)
		writeError(w, r, security.ErrInvalidCredentials)
		return
	}

	user, err := h.Security.Authenticate(r.Context(), req.UserName, req.Password)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	session, err := h.Security.CreateSession(r.Context(), user.ID, req.RememberMe)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	// Set session cookie. HttpOnly prevents JS access; SameSite=Lax allows
	// cross-tab sharing while blocking cross-site requests.
	maxAge := 0 // session cookie (deleted when browser closes)
	if req.RememberMe {
		maxAge = int(session.ExpireDate.Sub(time.Now()).Seconds())
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    session.Token,
		Path:     "/",
		MaxAge:   maxAge,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	op.OK(http.StatusOK, "user_id", user.ID, "user_name", user.Name)
	writeJSON(w, r, http.StatusOK, map[string]any{
		"id":       user.ID,
		"name":     user.Name,
		"fullName": user.FullName,
	})
}

func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "AuthHandler.Logout")

	// Clear the session cookie.
	if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie != nil {
		if err := h.Security.DeleteSession(r.Context(), cookie.Value); err != nil {
			slog.Warn("failed to delete session", "error", err)
		}
	}
	http.SetCookie(w, &http.Cookie{
		Name:     sessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: http.SameSiteLaxMode,
	})

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{"status": "ok"})
}

// ProjectsHandler serves OneDev-compatible /~api/projects endpoints.
type ProjectsHandler struct {
	Projects projectService
	Security securityService
	SSHAddr  string // e.g. ":9911" — used to construct SSH clone URLs
}

// cloneURLResponse is the JSON shape for GET /~api/projects/{id}/clone-url.
type cloneURLResponse struct {
	HTTP string `json:"http"`
	SSH  string `json:"ssh"`
}

// CloneURL returns HTTP and SSH clone URLs for a project.
func (h *ProjectsHandler) CloneURL(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "ProjectsHandler.CloneURL", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	p, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if p == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "project", "project_id", projectID)
		return
	}

	// Determine the scheme from common reverse-proxy headers.
	scheme := "http"
	if r.TLS != nil || r.Header.Get("X-Forwarded-Proto") == "https" {
		scheme = "https"
	}

	httpURL := scheme + "://" + r.Host + "/" + p.Path + ".git"

	// Build SSH clone URL. Extract host from r.Host (strip port if present).
	sshHost := r.Host
	if idx := strings.LastIndex(sshHost, ":"); idx != -1 {
		sshHost = sshHost[:idx]
	}
	sshPort := strings.TrimPrefix(h.SSHAddr, ":")
	sshURL := "ssh://git@" + sshHost + ":" + sshPort + "/" + p.Path + ".git"

	op.OK(http.StatusOK, "project_path", p.Path)
	writeJSON(w, r, http.StatusOK, cloneURLResponse{HTTP: httpURL, SSH: sshURL})
}

// projectListItem enriches a Project with aggregate git stats and child
// count for the project list page.
type projectListItem struct {
	model.Project
	Stats      *git.ProjectStats `json:"stats,omitempty"`
	ChildCount int               `json:"childCount"`
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

	result := make([]projectListItem, 0, len(projects))
	for _, p := range projects {
		item := projectListItem{Project: *p}
		if stats, err := h.Projects.Stats(r.Context(), p.ID); err == nil && stats != nil {
			item.Stats = stats
		}
		if count, err := h.Projects.CountChildren(r.Context(), p.ID); err == nil {
			item.ChildCount = count
		}
		result = append(result, item)
	}
	op.OK(http.StatusOK, "count", len(result))
	writeJSON(w, r, http.StatusOK, result)
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

func (h *ProjectsHandler) Delete(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "ProjectsHandler.Delete", "project_id", id)
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

	// Only root or project owners can delete.
	ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, id)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !ok {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Projects.Delete(r.Context(), id); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent, "project_id", id)
	w.WriteHeader(http.StatusNoContent)
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

// Update updates project general information — mirrors OneDev POST /~api/projects/{projectId}.
func (h *ProjectsHandler) Update(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "ProjectsHandler.Update", "project_id", projectID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !ok {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var p model.Project
	if err := decodeJSON(r, &p); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	p.ID = projectID

	if err := h.Projects.Update(r.Context(), &p); err != nil {
		if errors.Is(err, project.ErrAlreadyExists) || errors.Is(err, project.ErrInvalidName) {
			op.Fail(err, http.StatusNotAcceptable)
			http.Error(w, err.Error(), http.StatusNotAcceptable)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	updated, err := h.Projects.Get(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, updated)
}

// GetSetting returns all project settings — mirrors OneDev GET /~api/projects/{projectId}/setting.
func (h *ProjectsHandler) GetSetting(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "ProjectsHandler.GetSetting", "project_id", projectID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !ok {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	setting, err := h.Projects.GetSetting(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, setting)
}

// UpdateSetting updates all project settings — mirrors OneDev POST /~api/projects/{projectId}/setting.
func (h *ProjectsHandler) UpdateSetting(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "ProjectsHandler.UpdateSetting", "project_id", projectID)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !ok {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var setting model.ProjectSetting
	if err := decodeJSON(r, &setting); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}

	if err := h.Projects.UpdateSetting(r.Context(), projectID, &setting); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent)
	w.WriteHeader(http.StatusNoContent)
}

func (h *ProjectsHandler) authenticate(r *http.Request) (*security.User, error) {
	// Check context first (populated by CookieAuth middleware).
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	// Fall back to explicit auth headers for CLI/API clients.
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
	Security securityService
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
	query := strings.TrimSpace(strings.ToLower(r.URL.Query().Get("query")))
	type userView struct {
		ID       int64  `json:"id"`
		Name     string `json:"name"`
		FullName string `json:"fullName"`
	}
	views := make([]userView, 0, len(users))
	for _, u := range users {
		if query != "" {
			name := strings.ToLower(u.Name)
			fullName := strings.ToLower(u.FullName)
			if !strings.Contains(name, query) && !strings.Contains(fullName, query) {
				continue
			}
		}
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
	// Check context first (populated by CookieAuth middleware).
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	// Fall back to explicit auth headers for CLI/API clients.
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
