package api

import (
	"net/http"
)

// SettingsHandler serves public read-only settings used by the web UI before login.
type SettingsHandler struct{}

func (h *SettingsHandler) Branding(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SettingsHandler.Branding")
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]string{
		"name": "BuildX",
	})
}

func (h *SettingsHandler) Security(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SettingsHandler.Security")
	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, map[string]bool{
		"enableAnonymousAccess": false,
		"enableSelfRegister":    true,
	})
}

func (h *SettingsHandler) SsoProviders(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "SettingsHandler.SsoProviders")
	op.OK(http.StatusOK, "count", 0)
	writeJSON(w, r, http.StatusOK, []any{})
}
