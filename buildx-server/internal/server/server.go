package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
	"github.com/hitzhangjie/buildx/buildx-server/internal/version"
)

// Server is the BuildX application server.
type Server struct {
	cfg    *config.Config
	router chi.Router
	http   *http.Server
}

// New constructs a Server with routes wired but not yet listening.
func New(cfg *config.Config) *Server {
	s := &Server{cfg: cfg}
	s.router = s.routes()
	s.http = &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           s.router,
		ReadHeaderTimeout: 10 * time.Second,
	}
	return s
}

func (s *Server) routes() chi.Router {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Get("/~health", s.handleHealth)
	r.Get("/~api/v1/info", s.handleInfo)
	r.Get("/~api/cli/check-version", s.handleCLICheckVersion)

	// Static web UI — placeholder until OneDev-compatible frontend is integrated.
	r.Handle("/*", http.FileServer(http.Dir("web/dist")))

	return r
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = w.Write([]byte(`{"status":"ok"}`))
}

func (s *Server) handleInfo(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"name":"BuildX","version":%q,"dev":%t}`, version.Version, s.cfg.Dev)
}

func (s *Server) handleCLICheckVersion(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"serverVersion":%q,"minRequiredCliVersion":%q}`, version.Version, "0.1.0")
}

// Run starts the HTTP server and blocks until ctx is cancelled.
func (s *Server) Run(ctx context.Context) error {
	slog.Info("starting buildx-server",
		"version", version.Version,
		"http", s.cfg.HTTPAddr,
		"ssh", s.cfg.SSHAddr,
		"data_dir", s.cfg.DataDir,
		"dev", s.cfg.Dev,
	)

	errCh := make(chan error, 1)
	go func() {
		if err := s.http.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errCh <- err
		}
		close(errCh)
	}()

	select {
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		return s.http.Shutdown(shutdownCtx)
	case err := <-errCh:
		return err
	}
}
