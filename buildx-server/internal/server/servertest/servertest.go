// Package servertest starts buildx-server for integration tests.
//
// It is not for production use. Tests should prefer this over reaching into
// unexported server fields (store, http, router).
package servertest

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server"
)

// Options configures a test server instance.
type Options struct {
	// DataDir is the server data root. Empty means t.TempDir().
	DataDir string
	// Initial admin bootstrap credentials (BUILDX_INITIAL_*).
	InitialUser     string
	InitialPassword string
	InitialEmail    string
}

// Fixture is a running test HTTP server backed by a real SQLite store.
type Fixture struct {
	BaseURL string
	DataDir string

	srv *server.Server
	htt *httptest.Server
}

// Start boots a server with migrations/bootstrap applied and serves Handler()
// via httptest (no manual net.Listen or health polling required).
func Start(t *testing.T, opts Options) *Fixture {
	t.Helper()

	dataDir := opts.DataDir
	if dataDir == "" {
		dataDir = t.TempDir()
	}

	if opts.InitialUser != "" {
		t.Setenv("BUILDX_INITIAL_USER", opts.InitialUser)
	}
	if opts.InitialPassword != "" {
		t.Setenv("BUILDX_INITIAL_PASSWORD", opts.InitialPassword)
	}
	if opts.InitialEmail != "" {
		t.Setenv("BUILDX_INITIAL_EMAIL", opts.InitialEmail)
	}

	cfg := &config.Config{
		HTTPAddr: "127.0.0.1:0",
		SSHAddr:  "127.0.0.1:0",
		DataDir:  dataDir,
		Dev:      true,
	}
	if err := cfg.Revalidate(); err != nil {
		t.Fatalf("revalidate config: %v", err)
	}

	srv, err := server.New(cfg)
	if err != nil {
		t.Fatalf("new server: %v", err)
	}
	if err := srv.Init(context.Background()); err != nil {
		_ = srv.Close()
		t.Fatalf("init server: %v", err)
	}

	htt := httptest.NewServer(srv.Handler())

	t.Cleanup(func() {
		htt.Close()
		_ = srv.Close()
	})

	return &Fixture{
		BaseURL: htt.URL,
		DataDir: dataDir,
		srv:     srv,
		htt:     htt,
	}
}
