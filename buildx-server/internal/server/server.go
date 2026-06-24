// Package server implements the BuildX application server.
package server

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/hitzhangjie/buildx/buildx-server/internal/codecomment"
	"github.com/hitzhangjie/buildx/buildx-server/internal/config"
	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
	"github.com/hitzhangjie/buildx/buildx-server/internal/invitation"
	"github.com/hitzhangjie/buildx/buildx-server/internal/issuesetting"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	bxmiddleware "github.com/hitzhangjie/buildx/buildx-server/internal/server/middleware"
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

	authHandler := &api.AuthHandler{Security: sec}
	projectHandler := &api.ProjectsHandler{Projects: projects, Security: sec, SSHAddr: s.cfg.SSHAddr}
	userHandler := &api.UsersHandler{Security: sec}
	settingsHandler := &api.SettingsHandler{}
	searchHandler := &api.SearchHandler{Projects: projects, Security: sec}
	codeComments := codecomment.NewDBStore(s.store.DB())
	codeCommentsHandler := &api.CodeCommentsHandler{Comments: codeComments, Projects: projects, Security: sec}
	issuesStore := issue.NewDBStore(s.store.DB())
	issuesHandler := &api.IssuesHandler{Issues: issuesStore, Projects: projects, Security: sec}
	issueCommentsHandler := &api.IssueCommentsHandler{Issues: issuesStore, Security: sec}
	buildsStore := build.NewDBStore(s.store.DB())
	buildsHandler := &api.BuildsHandler{Builds: buildsStore, Projects: projects, Security: sec}
	iterationsHandler := &api.IterationsHandler{Iterations: issuesStore, Projects: projects, Security: sec}
	issueSettingStore := issuesetting.NewDBStore(s.store.DB())
	issueSettingsHandler := &api.IssueSettingsHandler{Settings: issueSettingStore, Security: sec}
	pullRequestsStore := pullrequest.NewDBStore(s.store.DB())
	pullRequestsService := &pullrequest.Service{Store: pullRequestsStore, Project: projects}
	pullRequestsHandler := &api.PullRequestsHandler{
		Service:  pullRequestsService,
		Store:    pullRequestsStore,
		Projects: projects,
		Security: sec,
	}
	blobHandler := &api.BlobHandler{Projects: projects, Security: sec, Search: searchHandler, CodeComments: codeCommentsHandler}
	repoHandler := &api.RepositoryHandler{Projects: projects, Security: sec, PullRequests: pullRequestsStore}
	gitHandler := &api.GitHandler{Projects: projects, Security: sec}
	tokenHandler := &api.AccessTokensHandler{Security: sec}
	invitationsStore := invitation.NewDBStore(s.store.DB())
	invitationsHandler := &api.InvitationsHandler{Invitations: invitationsStore, Security: sec}

	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(bxmiddleware.AccessLog)
	r.Use(bxmiddleware.CookieAuth(sec)) // populate context from session cookie
	r.Use(gitHandler.Middleware)        // intercept git HTTP before static catch-all
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(60 * time.Second))

	r.Get("/~health", s.handleHealth)
	r.Get("/~api/v1/info", s.handleInfo)
	r.Get("/~api/cli/check-version", s.handleCLICheckVersion)
	r.Get("/~api/v1/settings/branding", settingsHandler.Branding)
	r.Get("/~api/v1/settings/security", settingsHandler.Security)
	r.Get("/~api/v1/sso-providers", settingsHandler.SsoProviders)

	// Login/logout — cookie-based session management.
	r.Post("/~api/v1/login", authHandler.Login)
	r.Post("/~api/v1/logout", authHandler.Logout)

	r.Route("/~api", func(r chi.Router) {
		r.Get("/users", userHandler.List)
		r.Post("/users", userHandler.Create)
		r.Get("/users/me", userHandler.Me)

		r.Get("/invitations", invitationsHandler.List)
		r.Post("/invitations", invitationsHandler.Create)
		r.Post("/invitations/{invitationId}/resend", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "invitationId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid invitation id", http.StatusBadRequest)
				return
			}
			invitationsHandler.Resend(w, r, id)
		})
		r.Delete("/invitations/{invitationId}", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "invitationId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid invitation id", http.StatusBadRequest)
				return
			}
			invitationsHandler.Delete(w, r, id)
		})

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
		r.Delete("/projects/{projectId}", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid project id", http.StatusBadRequest)
				return
			}
			projectHandler.Delete(w, r, id)
		})

		r.Get("/repositories/{projectId}/branches", repoHandler.ListBranches)
		r.Get("/repositories/{projectId}/default-branch", repoHandler.GetDefaultBranch)
		r.Get("/repositories/{projectId}/branches/*", repoHandler.GetBranch)
		r.Get("/repositories/{projectId}/tags", repoHandler.ListTags)
		r.Get("/repositories/{projectId}/tags/*", repoHandler.GetTag)
		r.Get("/repositories/{projectId}/commits", repoHandler.ListCommits)
		r.Get("/repositories/{projectId}/commits/{commitHash}", repoHandler.GetCommit)
		r.Get("/repositories/{projectId}/compare", repoHandler.Compare)
		r.Get("/repositories/{projectId}/compare/patch", repoHandler.ComparePatch)

		// Access token management.
		r.Get("/access-tokens", tokenHandler.List)
		r.Post("/access-tokens", tokenHandler.Create)
		r.Get("/access-tokens/{accessTokenId}", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "accessTokenId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid access token id", http.StatusBadRequest)
				return
			}
			tokenHandler.Get(w, r, id)
		})
		r.Delete("/access-tokens/{accessTokenId}", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "accessTokenId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid access token id", http.StatusBadRequest)
				return
			}
			tokenHandler.Delete(w, r, id)
		})

		r.Get("/projects/{projectId}/iterations", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid project id", http.StatusBadRequest)
				return
			}
			iterationsHandler.QueryByProject(w, r, id)
		})

		r.Get("/projects/{projectId}/clone-url", func(w http.ResponseWriter, r *http.Request) {
			id, err := strconv.ParseInt(chi.URLParam(r, "projectId"), 10, 64)
			if err != nil {
				http.Error(w, "invalid project id", http.StatusBadRequest)
				return
			}
			projectHandler.CloneURL(w, r, id)
		})

		// Blob: wildcard catches project paths with optional slashes (nested projects).
		r.Get("/projects/*", blobHandler.ServeHTTP)

		// File create/update: POST with commit message and base64 content.
		r.Post("/projects/*", blobHandler.FilesPost)

		r.Get("/code-comments/{commentId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseCommentID(w, r)
			if !ok {
				return
			}
			codeCommentsHandler.Get(w, r, id)
		})
		r.Get("/code-comments/{commentId}/replies", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseCommentID(w, r)
			if !ok {
				return
			}
			codeCommentsHandler.ListReplies(w, r, id)
		})
		r.Post("/code-comments", codeCommentsHandler.Create)
		r.Post("/code-comments/{commentId}/replies", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseCommentID(w, r)
			if !ok {
				return
			}
			codeCommentsHandler.CreateReply(w, r, id)
		})
		r.Post("/code-comments/{commentId}/resolved", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseCommentID(w, r)
			if !ok {
				return
			}
			codeCommentsHandler.SetResolved(w, r, id)
		})
		r.Delete("/code-comments/{commentId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseCommentID(w, r)
			if !ok {
				return
			}
			codeCommentsHandler.Delete(w, r, id)
		})

		r.Get("/settings/issue", issueSettingsHandler.GetIssue)
		r.Post("/settings/issue", issueSettingsHandler.SetIssue)

		r.Get("/issues", issuesHandler.Query)
		r.Post("/issues", issuesHandler.Create)
		r.Get("/issues/{issueId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.Get(w, r, id)
		})
		r.Get("/issues/{issueId}/comments", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.ListComments(w, r, id)
		})
		r.Get("/issues/{issueId}/iterations", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.ListIterations(w, r, id)
		})
		r.Post("/issues/{issueId}/iterations", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.SetIterations(w, r, id)
		})
		r.Post("/issues/{issueId}/title", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.SetTitle(w, r, id)
		})
		r.Post("/issues/{issueId}/description", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.SetDescription(w, r, id)
		})
		r.Post("/issues/{issueId}/state-transitions", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.TransitState(w, r, id)
		})
		r.Delete("/issues/{issueId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueID(w, r)
			if !ok {
				return
			}
			issuesHandler.Delete(w, r, id)
		})

		r.Get("/issue-comments/{commentId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueCommentID(w, r)
			if !ok {
				return
			}
			issueCommentsHandler.Get(w, r, id)
		})
		r.Post("/issue-comments", issueCommentsHandler.Create)
		r.Post("/issue-comments/{commentId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueCommentID(w, r)
			if !ok {
				return
			}
			issueCommentsHandler.Update(w, r, id)
		})
		r.Delete("/issue-comments/{commentId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIssueCommentID(w, r)
			if !ok {
				return
			}
			issueCommentsHandler.Delete(w, r, id)
		})

		r.Get("/iterations/{iterationId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIterationID(w, r)
			if !ok {
				return
			}
			iterationsHandler.Get(w, r, id)
		})
		r.Get("/iterations/{iterationId}/issues", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIterationID(w, r)
			if !ok {
				return
			}
			iterationsHandler.ListIssues(w, r, id)
		})
		r.Get("/iterations/{iterationId}/burndown", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIterationID(w, r)
			if !ok {
				return
			}
			iterationsHandler.BurndownStats(w, r, id)
		})
		r.Post("/iterations", iterationsHandler.Create)
		r.Post("/iterations/{iterationId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIterationID(w, r)
			if !ok {
				return
			}
			iterationsHandler.Update(w, r, id)
		})
		r.Delete("/iterations/{iterationId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseIterationID(w, r)
			if !ok {
				return
			}
			iterationsHandler.Delete(w, r, id)
		})

		r.Get("/pulls", pullRequestsHandler.Query)
		r.Post("/pulls", pullRequestsHandler.Create)
		r.Get("/pulls/{requestId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.Get(w, r, id)
		})
		r.Get("/pulls/{requestId}/merge-preview", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.MergePreview(w, r, id)
		})
		r.Get("/pulls/{requestId}/comments", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.ListComments(w, r, id)
		})
		r.Get("/pulls/{requestId}/reviews", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.ListReviews(w, r, id)
		})
		r.Post("/pulls/{requestId}/title", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.SetTitle(w, r, id)
		})
		r.Post("/pulls/{requestId}/description", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.SetDescription(w, r, id)
		})
		r.Post("/pulls/{requestId}/merge-strategy", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.SetMergeStrategy(w, r, id)
		})
		r.Post("/pulls/{requestId}/merge", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.Merge(w, r, id)
		})
		r.Post("/pulls/{requestId}/discard", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.Discard(w, r, id)
		})
		r.Post("/pulls/{requestId}/reopen", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParsePullRequestID(w, r)
			if !ok {
				return
			}
			pullRequestsHandler.Reopen(w, r, id)
		})
		r.Post("/pull-request-comments", pullRequestsHandler.CreateComment)
		r.Post("/pull-request-reviews", pullRequestsHandler.CreateReview)

		r.Get("/builds", buildsHandler.Query)
		r.Get("/builds/{buildId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.Get(w, r, id)
		})
		r.Get("/builds/{buildId}/labels", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.ListLabels(w, r, id)
		})
		r.Get("/builds/{buildId}/params", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.ListParams(w, r, id)
		})
		r.Get("/builds/{buildId}/dependencies", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.ListDependencies(w, r, id)
		})
		r.Get("/builds/{buildId}/dependents", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.ListDependents(w, r, id)
		})
		r.Get("/builds/{buildId}/fixed-issue-ids", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.ListFixedIssueIDs(w, r, id)
		})
		r.Post("/builds/{buildId}/description", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.SetDescription(w, r, id)
		})
		r.Delete("/builds/{buildId}", func(w http.ResponseWriter, r *http.Request) {
			id, ok := api.ParseBuildID(w, r)
			if !ok {
				return
			}
			buildsHandler.Delete(w, r, id)
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

// Handler returns the root HTTP handler (chi router with all routes).
func (s *Server) Handler() http.Handler {
	return s.router
}

// Init runs database migrations and bootstrap seeding.
func (s *Server) Init(ctx context.Context) error {
	if err := s.store.Migrate(ctx); err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	if err := s.store.Bootstrap(ctx); err != nil {
		return fmt.Errorf("bootstrap database: %w", err)
	}
	return nil
}

// Close releases server resources (database connections).
func (s *Server) Close() error {
	return s.store.Close()
}

// Run starts the HTTP server and blocks until ctx is cancelled.
func (s *Server) Run(ctx context.Context) error {
	if err := s.Init(ctx); err != nil {
		_ = s.store.Close()
		return err
	}
	defer func() { _ = s.store.Close() }()

	listener, err := net.Listen("tcp", s.cfg.HTTPAddr)
	if err != nil {
		return fmt.Errorf("listen http %s: %w", s.cfg.HTTPAddr, err)
	}
	slog.Info("listening",
		"version", version.Version,
		"http", listener.Addr().String(),
		"ssh", s.cfg.SSHAddr,
		"data_dir", s.cfg.DataDir,
		"dev", s.cfg.Dev,
	)

	errCh := make(chan error, 1)
	go func() {
		if err := s.http.Serve(listener); err != nil && err != http.ErrServerClosed {
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
