package api

import (
	"context"
	"errors"
	"net/http"

	"github.com/hitzhangjie/buildx/buildx-server/internal/issuesetting"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

type issueSettingStore interface {
	Get(ctx context.Context) (*issuesetting.GlobalIssueSetting, error)
	Save(ctx context.Context, setting *issuesetting.GlobalIssueSetting) error
}

// IssueSettingsHandler serves GET/POST /~api/settings/issue.
type IssueSettingsHandler struct {
	Settings issueSettingStore
	Security securityService
}

// GetIssue handles GET /~api/settings/issue.
func (h *IssueSettingsHandler) GetIssue(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IssueSettingsHandler.GetIssue")
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	_ = user

	setting, err := h.Settings.Get(r.Context())
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, setting)
}

// SetIssue handles POST /~api/settings/issue.
func (h *IssueSettingsHandler) SetIssue(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "IssueSettingsHandler.SetIssue")
	user, err := h.authenticate(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	if user.ID != model.UserRootID {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	var setting issuesetting.GlobalIssueSetting
	if err := decodeJSON(r, &setting); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}
	if len(setting.StateSpecs) == 0 {
		op.Fail(errors.New("stateSpecs required"), http.StatusBadRequest)
		writeJSONError(w, http.StatusBadRequest, "stateSpecs is required")
		return
	}

	if err := h.Settings.Save(r.Context(), &setting); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	w.WriteHeader(http.StatusOK)
}

func (h *IssueSettingsHandler) authenticate(r *http.Request) (*model.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	return nil, security.ErrUnauthorized
}

func (h *IssueSettingsHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}
