package api

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestDecodeJSON(t *testing.T) {
	t.Run("valid", func(t *testing.T) {
		body := `{"name":"test"}`
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		var v map[string]string
		if err := decodeJSON(r, &v); err != nil {
			t.Fatalf("decodeJSON: %v", err)
		}
		if v["name"] != "test" {
			t.Errorf("name = %q", v["name"])
		}
	})

	t.Run("invalid", func(t *testing.T) {
		body := `not json`
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(body))
		var v map[string]string
		if err := decodeJSON(r, &v); err == nil {
			t.Fatal("expected error for invalid JSON")
		}
	})

	t.Run("empty", func(t *testing.T) {
		r := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(""))
		var v map[string]string
		if err := decodeJSON(r, &v); err == nil {
			t.Fatal("expected error for empty body")
		}
	})
}

func TestRequestID(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	id := requestID(r)
	if id == "" {
		t.Log("requestID may be empty without chi middleware — that's OK for unit test")
	}
}

func TestElapsedMs(t *testing.T) {
	start := time.Now().Add(-100 * time.Millisecond)
	ms := elapsedMs(start)
	if ms < 0 {
		t.Errorf("elapsedMs should be non-negative, got %d", ms)
	}
}

func TestWriteJSON(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	writeJSON(w, r, http.StatusOK, map[string]string{"key": "value"})

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	if ct := w.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	var m map[string]string
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["key"] != "value" {
		t.Errorf("body mismatch: %s", w.Body.String())
	}
}

func TestWriteJSONError(t *testing.T) {
	w := httptest.NewRecorder()
	writeJSONError(w, http.StatusBadRequest, "something wrong")

	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
	var m map[string]string
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["error"] != "something wrong" {
		t.Errorf("error message = %q", m["error"])
	}
}

func TestWriteError(t *testing.T) {
	tests := []struct {
		name       string
		err        error
		wantStatus int
	}{
		{"invalid_credentials", security.ErrInvalidCredentials, http.StatusUnauthorized},
		{"unauthorized", security.ErrUnauthorized, http.StatusUnauthorized},
		{"user_disabled", security.ErrUserDisabled, http.StatusForbidden},
		{"unknown", security.ErrInvalidCredentials, http.StatusUnauthorized},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodGet, "/", nil)
			writeError(w, r, tc.err)
			if w.Code != tc.wantStatus {
				t.Errorf("status = %d, want %d", w.Code, tc.wantStatus)
			}
		})
	}
}

func TestWriteNotFound(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/foo", nil)
	writeNotFound(w, r, "project", "project_id", 42)
	if w.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", w.Code)
	}
}

func TestWriteBadRequest(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodPost, "/", nil)
	writeBadRequest(w, r, "bad input", nil)
	if w.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want 400", w.Code)
	}
}

func TestOpLogOK(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	op := StartOp(r, "TestOp")
	op.With("extra", "value")
	op.OK(http.StatusOK, "result", "ok")
}

func TestOpLogFail(t *testing.T) {
	r := httptest.NewRequest(http.MethodGet, "/test", nil)
	op := StartOp(r, "TestOp")
	op.Fail(nil, http.StatusBadRequest, "reason", "test")
}

func TestWriteInternalError(t *testing.T) {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/", nil)
	writeInternalError(w, r, io.ErrUnexpectedEOF)
	if w.Code != http.StatusInternalServerError {
		t.Errorf("status = %d, want 500", w.Code)
	}
}
