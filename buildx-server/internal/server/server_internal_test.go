package server

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestHandleHealth(t *testing.T) {
	s := &Server{cfg: &config.Config{}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~health", nil)

	s.handleHealth(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var m map[string]string
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["status"] != "ok" {
		t.Errorf("status = %q, want ok", m["status"])
	}
}

func TestHandleInfo(t *testing.T) {
	s := &Server{cfg: &config.Config{Dev: true}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/v1/info", nil)

	s.handleInfo(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var m map[string]any
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["name"] != "BuildX" {
		t.Errorf("name = %q", m["name"])
	}
}

func TestHandleCLICheckVersion(t *testing.T) {
	s := &Server{cfg: &config.Config{}}
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/~api/cli/check-version", nil)

	s.handleCLICheckVersion(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", w.Code)
	}
	var m map[string]any
	json.Unmarshal(w.Body.Bytes(), &m)
	if m["serverVersion"] == nil {
		t.Error("expected serverVersion field")
	}
}

func TestHandler(t *testing.T) {
	s := &Server{cfg: &config.Config{}}
	s.router = nil // Handler just returns the router; nil is valid here.
	h := s.Handler()
	// Handler may be nil if router not set — that's fine for this unit test.
	_ = h
}

func TestNew(t *testing.T) {
	cfg := &config.Config{
		HTTPAddr: ":19810",
		SSHAddr:  ":19811",
		DataDir:  t.TempDir(),
		Dev:      true,
	}
	srv, err := New(cfg)
	if err != nil {
		t.Fatalf("New: %v", err)
	}
	if srv == nil {
		t.Fatal("expected non-nil server")
	}
	if srv.http == nil {
		t.Fatal("expected non-nil http server")
	}
	if srv.http.Addr != ":19810" {
		t.Errorf("http addr = %q", srv.http.Addr)
	}
	srv.Close()
}

func TestInit(t *testing.T) {
	cfg := &config.Config{
		HTTPAddr: ":0",
		SSHAddr:  ":0",
		DataDir:  t.TempDir(),
	}
	srv, _ := New(cfg)
	defer srv.Close()

	ctx := context.Background()
	if err := srv.Init(ctx); err != nil {
		t.Fatalf("Init: %v", err)
	}
}

func TestClose(t *testing.T) {
	cfg := &config.Config{
		HTTPAddr: ":0",
		SSHAddr:  ":0",
		DataDir:  t.TempDir(),
	}
	srv, _ := New(cfg)
	if err := srv.Close(); err != nil {
		t.Fatalf("Close: %v", err)
	}
	// Double close should not panic.
	srv.Close()
}
