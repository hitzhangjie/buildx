package api

import (
	"net/http"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// UserAuthorizationsHandler serves /~api/users/{userId}/authorizations endpoints.
type UserAuthorizationsHandler struct {
	Security securityService
}

// List returns all project authorizations for a user, grouped by project path.
func (h *UserAuthorizationsHandler) List(w http.ResponseWriter, r *http.Request, userID int64) {
	op := StartOp(r, "UserAuthorizationsHandler.List", "user_id", userID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	authz, err := h.Security.ListUserAuthorizations(r.Context(), userID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "count", len(authz))
	writeJSON(w, r, http.StatusOK, authz)
}

// Sync replaces all project authorizations for a user with the provided list.
func (h *UserAuthorizationsHandler) Sync(w http.ResponseWriter, r *http.Request, userID int64) {
	op := StartOp(r, "UserAuthorizationsHandler.Sync", "user_id", userID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var beans []model.UserAuthorizationInput
	if err := decodeJSON(r, &beans); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("count", len(beans))

	if err := h.Security.SyncUserAuthorizations(r.Context(), userID, beans); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent)
	w.WriteHeader(http.StatusNoContent)
}

func (h *UserAuthorizationsHandler) authenticate(r *http.Request) (*security.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	return nil, security.ErrUnauthorized
}

// ListByProject returns all user authorizations for a project, grouped by user name.
func (h *UserAuthorizationsHandler) ListByProject(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "UserAuthorizationsHandler.ListByProject", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	authz, err := h.Security.ListProjectUserAuthorizations(r.Context(), projectID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "count", len(authz))
	writeJSON(w, r, http.StatusOK, authz)
}

// SyncByProject replaces all user authorizations for a project with the provided list.
func (h *UserAuthorizationsHandler) SyncByProject(w http.ResponseWriter, r *http.Request, projectID int64) {
	op := StartOp(r, "UserAuthorizationsHandler.SyncByProject", "project_id", projectID)
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	var beans []model.ProjectUserAuthorizationInput
	if err := decodeJSON(r, &beans); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("count", len(beans))

	if err := h.Security.SyncProjectUserAuthorizations(r.Context(), projectID, beans); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent)
	w.WriteHeader(http.StatusNoContent)
}
