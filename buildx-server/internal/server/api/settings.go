package api

import (
	"net/http"
)

// SettingsHandler serves public read-only settings used by the web UI before login.
type SettingsHandler struct{}

func (h *SettingsHandler) Branding(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"name": "BuildX",
	})
}

func (h *SettingsHandler) Security(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]bool{
		"enableAnonymousAccess": false,
		"enableSelfRegister":    true,
	})
}

func (h *SettingsHandler) SsoProviders(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, []any{})
}
