package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/version"
)

// Server is the BuildX application server.
type Server struct {
	cfg    *config.Config
	store  *sqlite.Store
	router chi.Router
	http   *http.Server
}

// New constructs a Server with routes wired but not yet listening.
func New(cfg *config.Config) (*Server, error) {
	store, err := sqlite.Open(cfg.DataDir)
	if err != nil {
		return nil, err
	}
	s := &Server{cfg: cfg, store: store}
	s.router = s.routes()
	s.http = &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           s.router,
		ReadHeaderTimeout: 10 * time.Second,
	}
	return s, nil
}

func (s *Server) routes() chi.Router {
	sec := security.NewDBStore(s.store.DB())
	projects := project.NewDBStore(s.store.DB(), s.cfg.DataDir)

	projectHandler := &api.ProjectsHandler{Projects: projects, Security: sec}
	userHandler := &api.UsersHandler{Security: sec}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Get("/~health", s.handleHealth)
	r.Get("/~api/v1/info", s.handleInfo)
	r.Get("/~api/cli/check-version", s.handleCLICheckVersion)

	r.Route("/~api", func(r chi.Router) {
		r.Get("/users", userHandler.List)
		r.Post("/users", userHandler.Create)
		r.Get("/users/me", userHandler.Me)

		r.Get("/projects", projectHandler.List)
		r.Post("/projects", projectHandler.Create)
		r.Post("/projects/setup", projectHandler.Setup)
		r.Get("/projects/{projectId}", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid project id", http.StatusBadRequest)
				return
			}
			projectHandler.Get(w, r, id)
		})
	})

	// Static web UI — embedded placeholder, or BUILDX_WEB_DIR when OneDev assets are deployed.
	r.Handle("/*", webHandler(s.cfg.WebDir))

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
	if err := s.store.Migrate(ctx); err != nil {
		_ = s.store.Close()
		return fmt.Errorf("migrate database: %w", err)
	}
	defer func() { _ = s.store.Close() }()

	if err := s.store.Bootstrap(ctx); err != nil {
		return fmt.Errorf("bootstrap database: %w", err)
	}

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
