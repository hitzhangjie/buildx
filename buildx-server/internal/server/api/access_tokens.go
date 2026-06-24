package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// AccessTokensHandler serves /~api/access-tokens endpoints.
type AccessTokensHandler struct {
	Security securityService
}

type createAccessTokenRequest struct {
	Name string `json:"name"`
}

// List returns all access tokens for the authenticated user.
// The token value is never included in the response.
func (h *AccessTokensHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "AccessTokensHandler.List")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	tokens, err := h.Security.ListAccessTokens(r.Context(), user.ID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusOK, "count", len(tokens))
	writeJSON(w, r, http.StatusOK, tokens)
}

// Create generates a new access token for the authenticated user.
// The token value is returned in the response — this is the only time it is exposed.
func (h *AccessTokensHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "AccessTokensHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	var req createAccessTokenRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	op.With("token_name", req.Name)

	if req.Name == "" {
		op.Fail(errors.New("missing name"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "name is required")
		return
	}

	// Check name uniqueness per owner (OneDev constraint).
	existing, err := h.Security.FindAccessTokenByOwnerAndName(r.Context(), user.ID, req.Name)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if existing != nil {
		op.Fail(errors.New("duplicate name"), http.StatusConflict)
		writeJSONError(w, http.StatusConflict, "Name already used by another access token of the owner")
		return
	}

	token, err := h.Security.CreateAccessToken(r.Context(), user.ID, req.Name)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusCreated, "token_id", token.ID, "token_name", token.Name)
	writeJSON(w, r, http.StatusCreated, token)
}

// Get returns a single access token by ID.
// Only the token owner or an administrator may access it.
// The token value is never included in the response.
func (h *AccessTokensHandler) Get(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "AccessTokensHandler.Get", "token_id", id)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	token, err := h.Security.FindAccessToken(r.Context(), id)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if token == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "access-token", "token_id", id)
		return
	}

	// Only the owner or root user can view a token.
	if token.OwnerID != user.ID && user.ID != model.UserRootID {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	op.OK(http.StatusOK, "token_name", token.Name)
	writeJSON(w, r, http.StatusOK, token)
}

// Delete removes an access token by ID.
// Only the token owner or an administrator may delete it.
func (h *AccessTokensHandler) Delete(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "AccessTokensHandler.Delete", "token_id", id)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	token, err := h.Security.FindAccessToken(r.Context(), id)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if token == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "access-token", "token_id", id)
		return
	}

	// Only the owner or root user can delete a token.
	if token.OwnerID != user.ID && user.ID != model.UserRootID {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Security.DeleteAccessToken(r.Context(), id); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent, "token_name", token.Name)
	w.WriteHeader(http.StatusNoContent)
}

func (h *AccessTokensHandler) authenticate(r *http.Request) (*security.User, error) {
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
