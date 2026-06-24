package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestSettingsBranding(t *testing.T) {
	h := &SettingsHandler{}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/v1/settings/branding", nil)
	h.Branding(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var m map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if m["name"] != "BuildX" {
		t.Errorf("name = %q, want BuildX", m["name"])
	}
}

func TestSettingsSecurity(t *testing.T) {
	h := &SettingsHandler{}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/v1/settings/security", nil)
	h.Security(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var m map[string]bool
	if err := json.Unmarshal(w.Body.Bytes(), &m); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if m["enableAnonymousAccess"] != false {
		t.Error("enableAnonymousAccess should be false")
	}
	if m["enableSelfRegister"] != true {
		t.Error("enableSelfRegister should be true")
	}
}

func TestSettingsSsoProviders(t *testing.T) {
	h := &SettingsHandler{}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/v1/sso-providers", nil)
	h.SsoProviders(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", w.Code)
	}
	var arr []any
	if err := json.Unmarshal(w.Body.Bytes(), &arr); err != nil {
		t.Fatalf("json decode: %v", err)
	}
	if len(arr) != 0 {
		t.Errorf("sso providers = %v, want empty", arr)
	}
}
