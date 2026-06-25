package api

import (
	"bytes"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// GitHandler serves Git smart HTTP protocol requests — clone, fetch, push.
//
// URL pattern: /{projectPath}.git/{git-suffix}
// git-suffix is one of: info/refs, git-upload-pack, git-receive-pack.
//
// Push uses native git receive-pack; successful pushes optionally notify
// CINotifier for branch/tag trigger matching.
//
// Maps to OneDev: io.onedev.server.git.GitFilter
type GitHandler struct {
	Projects   projectService
	Security   securityService
	CINotifier CINotifier // optional CI trigger hook after push
}

// Middleware intercepts git requests and delegates others to next.
// It must be registered before the /* static web catch-all.
func (h *GitHandler) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isGitRequest(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}
		h.serveHTTP(w, r)
	})
}

// isGitRequest returns true when the URL path contains .git/ followed by
// a recognised git HTTP suffix.
func isGitRequest(path string) bool {
	idx := strings.Index(path, ".git/")
	if idx < 0 {
		return false
	}
	suffix := path[idx+len(".git/"):]
	switch suffix {
	case "info/refs", "git-upload-pack", "git-receive-pack":
		return true
	default:
		return false
	}
}

// serveHTTP dispatches to the appropriate handler.
func (h *GitHandler) serveHTTP(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "GitHandler.serveHTTP", "path", r.URL.Path)

	projectPath, gitSuffix, err := parseGitURL(r.URL.Path)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	op.With("project_path", projectPath, "git_suffix", gitSuffix)

	user, err := h.authenticateGit(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		h.writeGitError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	proj, err := h.Projects.GetByPath(r.Context(), projectPath)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if proj == nil {
		op.OK(http.StatusNotFound, "found", false)
		http.Error(w, "project not found: "+projectPath, http.StatusNotFound)
		return
	}
	op.With("project_id", proj.ID)

	if ok, err := h.Security.HasProjectAccess(r.Context(), user.ID, proj.ID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	} else if !ok {
		op.OK(http.StatusNotFound, "access", false)
		http.Error(w, "project not found or inaccessible: "+projectPath, http.StatusNotFound)
		return
	}

	gitDir := h.Projects.GitDir(proj.ID)

	if err := h.ensureGitRepo(gitDir); err != nil {
		op.Fail(err, http.StatusInternalServerError, "git_dir", gitDir)
		slog.ErrorContext(r.Context(), "failed to ensure git repository", "git_dir", gitDir, "error", err)
		http.Error(w, "repository unavailable", http.StatusInternalServerError)
		return
	}

	repo, err := git.Open(gitDir)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError, "git_dir", gitDir)
		slog.ErrorContext(r.Context(), "failed to open git repository", "git_dir", gitDir, "error", err)
		http.Error(w, "repository unavailable", http.StatusInternalServerError)
		return
	}

	switch gitSuffix {
	case "info/refs":
		h.handleInfoRefs(w, r, repo, user, proj, op)
	case "git-upload-pack":
		h.handleUploadPack(w, r, repo, op)
	case "git-receive-pack":
		h.handleReceivePack(w, r, repo, proj, user, op)
	default:
		op.Fail(nil, http.StatusBadRequest, "git_suffix", gitSuffix)
		http.Error(w, "unknown git service", http.StatusBadRequest)
	}
}

// parseGitURL splits /{projectPath}.git/{suffix} into its parts.
func parseGitURL(path string) (projectPath, gitSuffix string, err error) {
	idx := strings.Index(path, ".git/")
	if idx < 0 {
		return "", "", fmt.Errorf("not a git request")
	}
	projectPath = strings.TrimPrefix(path[:idx], "/")
	gitSuffix = path[idx+len(".git/"):]
	if projectPath == "" {
		return "", "", fmt.Errorf("empty project path")
	}
	return projectPath, gitSuffix, nil
}

// ---------- info/refs (reference advertisement) ----------

func (h *GitHandler) handleInfoRefs(w http.ResponseWriter, r *http.Request, repo *git.Repository, user *security.User, proj *project.Project, op *OpLog) {
	service := r.URL.Query().Get("service")
	op.With("service", service)
	if service == "" {
		op.Fail(nil, http.StatusForbidden, "reason", "dumb_http_not_supported")
		http.Error(w, "dumb HTTP protocol not supported", http.StatusForbidden)
		return
	}

	switch service {
	case "git-upload-pack":
		// Fetch/clone — any reader can access.
	case "git-receive-pack":
		if ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, proj.ID); err != nil {
			op.Fail(err, http.StatusInternalServerError)
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		} else if !ok {
			op.Fail(nil, http.StatusForbidden, "reason", "push_not_allowed")
			http.Error(w, "you do not have permission to push to this project", http.StatusForbidden)
			return
		}
	default:
		op.Fail(nil, http.StatusBadRequest, "service", service)
		http.Error(w, "unknown git service: "+service, http.StatusBadRequest)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")

	writePktLine(w, "# service="+service+"\n")
	writeFlushPkt(w)

	if err := repo.AdvertiseRefs(w, service); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		slog.ErrorContext(r.Context(), "advertise refs failed", "service", service, "error", err)
		return
	}
	op.OK(http.StatusOK, "service", service)
}

// ---------- git-upload-pack (fetch / clone) ----------

func (h *GitHandler) handleUploadPack(w http.ResponseWriter, r *http.Request, repo *git.Repository, op *OpLog) {
	if r.Method != http.MethodPost {
		op.Fail(nil, http.StatusMethodNotAllowed)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-upload-pack-result")

	if err := repo.UploadPack(w, r.Body); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		slog.ErrorContext(r.Context(), "upload-pack failed", "error", err)
		return
	}
	op.OK(http.StatusOK)
}

// ---------- git-receive-pack (push) ----------

// handleReceivePack delegates to native "git receive-pack --stateless-rpc".
// go-git's server-side receive-pack has known issues; see protocol.go.
func (h *GitHandler) handleReceivePack(w http.ResponseWriter, r *http.Request, repo *git.Repository, proj *project.Project, user *security.User, op *OpLog) {
	if r.Method != http.MethodPost {
		op.Fail(nil, http.StatusMethodNotAllowed)
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		http.Error(w, "read body", http.StatusBadRequest)
		return
	}

	updates, _ := git.ParseReceiveUpdates(body)

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-receive-pack-result")

	if err := repo.ReceivePack(w, bytes.NewReader(body)); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		slog.ErrorContext(r.Context(), "receive-pack failed", "error", err)
		return
	}

	if h.CINotifier != nil && user != nil {
		for _, upd := range updates {
			if git.IsZeroHash(upd.NewHash) {
				continue
			}
			var changed []string
			if files, err := repo.ChangedFilesBetween(upd.OldHash, upd.NewHash); err == nil {
				changed = files
			}
			h.CINotifier.NotifyRefUpdated(r.Context(), proj.ID, upd.RefName, upd.OldHash, upd.NewHash, user.ID, changed)
		}
	}

	op.OK(http.StatusOK, "ref_updates", len(updates))
}

// ---------- helpers ----------

// ensureGitRepo checks that a bare git repository exists at gitDir,
// creating it if necessary.
func (h *GitHandler) ensureGitRepo(gitDir string) error {
	// Check if HEAD exists — the minimal marker of a valid git repo.
	headPath := gitDir + "/HEAD"
	if _, err := os.Stat(headPath); err == nil {
		return nil
	}

	// Create directory and init bare repo.
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		return fmt.Errorf("mkdir git dir: %w", err)
	}

	if err := git.InitBare(gitDir); err != nil {
		return fmt.Errorf("init bare repo: %w", err)
	}

	slog.Info("lazy-initialized bare git repository", "git_dir", gitDir)
	return nil
}

func (h *GitHandler) authenticateGit(r *http.Request) (*security.User, error) {
	// Check context first (populated by CookieAuth middleware).
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])
		return h.Security.AuthenticateToken(r.Context(), token)
	}
	return nil, security.ErrUnauthorized
}

func (h *GitHandler) writeGitError(w http.ResponseWriter, r *http.Request, err error) {
	w.Header().Set("Content-Type", "text/plain")
	w.Header().Set("WWW-Authenticate", `Basic realm="BuildX"`)
	w.WriteHeader(http.StatusUnauthorized)
	_, _ = w.Write([]byte(err.Error()))
}

func doNotCache(w http.ResponseWriter) {
	w.Header().Set("Expires", "Fri, 01 Jan 1980 00:00:00 GMT")
	w.Header().Set("Pragma", "no-cache")
	w.Header().Set("Cache-Control", "no-cache, max-age=0, must-revalidate")
}

// writePktLine writes a Git pkt-line: 4 hex length (including itself) + data.
func writePktLine(w io.Writer, data string) {
	length := 4 + len(data)
	fmt.Fprintf(w, "%04x%s", length, data)
}

// writeFlushPkt writes a Git flush packet ("0000").
func writeFlushPkt(w io.Writer) {
	_, _ = w.Write([]byte("0000"))
}
