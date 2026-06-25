package api

import (
	"net/http"

	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// RolesHandler serves /~api/roles endpoint.
type RolesHandler struct {
	Security securityService
}

// List returns all defined roles.
func (h *RolesHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RolesHandler.List")
	if _, err := h.authenticate(r); err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	roles, err := h.Security.ListRoles(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "count", len(roles))
	writeJSON(w, r, http.StatusOK, roles)
}

func (h *RolesHandler) authenticate(r *http.Request) (*security.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	return nil, security.ErrUnauthorized
}
