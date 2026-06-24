package api

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/mail"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/invitation"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// InvitationsHandler serves /~api/invitations endpoints.
type InvitationsHandler struct {
	Invitations invitationStore
	Security    securityService
}

type invitationStore interface {
	List(ctx context.Context) ([]*model.Invitation, error)
	FindByID(ctx context.Context, id int64) (*model.Invitation, error)
	FindByEmail(ctx context.Context, email string) (*model.Invitation, error)
	Create(ctx context.Context, inv *model.Invitation) (*model.Invitation, error)
	Delete(ctx context.Context, id int64) error
	RefreshInvitationCode(ctx context.Context, id int64) (*model.Invitation, error)
	EmailInUse(ctx context.Context, email string) (bool, error)
}

type invitationView struct {
	ID           int64  `json:"id"`
	EmailAddress string `json:"emailAddress"`
	Status       string `json:"status"`
	CreatedAt    string `json:"createdAt,omitempty"`
}

type createInvitationsRequest struct {
	EmailAddresses []string `json:"emailAddresses"`
	Role           string   `json:"role"`
}

func (h *InvitationsHandler) List(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "InvitationsHandler.List")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if !isAdministrator(user) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	invitations, err := h.Invitations.List(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	views := make([]invitationView, 0, len(invitations))
	for _, inv := range invitations {
		status, err := h.invitationStatus(r, inv)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		views = append(views, toInvitationView(inv, status))
	}
	if views == nil {
		views = []invitationView{}
	}
	op.OK(http.StatusOK, "count", len(views))
	writeJSON(w, r, http.StatusOK, views)
}

func (h *InvitationsHandler) Create(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "InvitationsHandler.Create")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if !isAdministrator(user) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var req createInvitationsRequest
	if err := decodeJSON(r, &req); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if len(req.EmailAddresses) == 0 {
		op.Fail(errors.New("missing emails"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "at least one email address is required")
		return
	}

	role := strings.TrimSpace(req.Role)
	if role == "" {
		role = "developer"
	}

	for _, raw := range req.EmailAddresses {
		email, err := normalizeEmail(raw)
		if err != nil {
			op.Fail(err, http.StatusBadRequest)
			writeJSONError(w, http.StatusBadRequest, fmt.Sprintf("invalid email address: %s", strings.TrimSpace(raw)))
			return
		}
		inUse, err := h.Invitations.EmailInUse(r.Context(), email)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if inUse {
			op.Fail(errors.New("email in use"), http.StatusBadRequest)
			writeJSONError(w, http.StatusBadRequest, fmt.Sprintf("email address already in use: %s", email))
			return
		}
		existing, err := h.Invitations.FindByEmail(r.Context(), email)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if existing != nil {
			op.Fail(errors.New("already invited"), http.StatusBadRequest)
			writeJSONError(w, http.StatusBadRequest, fmt.Sprintf("email address already invited: %s", email))
			return
		}
		if _, err := h.Invitations.Create(r.Context(), &model.Invitation{
			EmailAddress: email,
			Role:         role,
		}); err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		// Mail delivery is not wired yet; log setup URL for development.
		slog.Info("invitation created (mail not configured)", "email", email, "role", role)
	}

	op.OK(http.StatusCreated, "count", len(req.EmailAddresses))
	writeJSON(w, r, http.StatusCreated, map[string]string{"status": "ok"})
}

func (h *InvitationsHandler) Resend(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "InvitationsHandler.Resend", "invitation_id", id)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if !isAdministrator(user) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	inv, err := h.Invitations.FindByID(r.Context(), id)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if inv == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "invitation", "invitation_id", id)
		return
	}

	inv, err = h.Invitations.RefreshInvitationCode(r.Context(), id)
	if err != nil {
		if errors.Is(err, invitation.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "invitation", "invitation_id", id)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	slog.Info("invitation resent (mail not configured)",
		"email", inv.EmailAddress,
		"invitation_id", inv.ID,
		"invitation_code", inv.InvitationCode,
	)
	op.OK(http.StatusNoContent, "email", inv.EmailAddress)
	w.WriteHeader(http.StatusNoContent)
}

func (h *InvitationsHandler) Delete(w http.ResponseWriter, r *http.Request, id int64) {
	op := StartOp(r, "InvitationsHandler.Delete", "invitation_id", id)
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if !isAdministrator(user) {
		op.Fail(errors.New("forbidden"), http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if err := h.Invitations.Delete(r.Context(), id); err != nil {
		if errors.Is(err, invitation.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "invitation", "invitation_id", id)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	op.OK(http.StatusNoContent, "invitation_id", id)
	w.WriteHeader(http.StatusNoContent)
}

func (h *InvitationsHandler) authenticate(r *http.Request) (*model.User, error) {
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

func isAdministrator(user *model.User) bool {
	return user != nil && user.ID == model.UserRootID
}

func (h *InvitationsHandler) invitationStatus(r *http.Request, inv *model.Invitation) (model.InvitationStatus, error) {
	inUse, err := h.Invitations.EmailInUse(r.Context(), inv.EmailAddress)
	if err != nil {
		return "", err
	}
	if inUse {
		return model.InvitationStatusAccepted, nil
	}
	return model.InvitationStatusPending, nil
}

func toInvitationView(inv *model.Invitation, status model.InvitationStatus) invitationView {
	view := invitationView{
		ID:           inv.ID,
		EmailAddress: inv.EmailAddress,
		Status:       string(status),
	}
	if !inv.CreateDate.IsZero() {
		view.CreatedAt = inv.CreateDate.UTC().Format(time.RFC3339Nano)
	}
	return view
}

func normalizeEmail(raw string) (string, error) {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return "", errors.New("empty email")
	}
	addr, err := mail.ParseAddress(trimmed)
	if err != nil {
		return "", err
	}
	return addr.Address, nil
}
