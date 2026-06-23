package api

import (
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
// All git operations use go-git (pure Go) — no system git CLI required.
//
// Maps to OneDev: io.onedev.server.git.GitFilter
type GitHandler struct {
	Projects *project.DBStore
	Security *security.DBStore
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
	projectPath, gitSuffix, err := parseGitURL(r.URL.Path)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Authenticate.
	user, err := h.authenticateGit(r)
	if err != nil {
		h.writeGitError(w, r, err)
		return
	}

	// Resolve project.
	proj, err := h.Projects.GetByPath(r.Context(), projectPath)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	if proj == nil {
		http.Error(w, "project not found: "+projectPath, http.StatusNotFound)
		return
	}

	// Check access.
	if ok, err := h.Security.HasProjectAccess(r.Context(), user.ID, proj.ID); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	} else if !ok {
		http.Error(w, "project not found or inaccessible: "+projectPath, http.StatusNotFound)
		return
	}

	gitDir := h.Projects.GitDir(proj.ID)

	// Ensure the bare git repository exists.
	if err := h.ensureGitRepo(gitDir); err != nil {
		slog.Error("failed to ensure git repository", "gitDir", gitDir, "error", err)
		http.Error(w, "repository unavailable", http.StatusInternalServerError)
		return
	}

	// Open the repository with go-git.
	repo, err := git.Open(gitDir)
	if err != nil {
		slog.Error("failed to open git repository", "gitDir", gitDir, "error", err)
		http.Error(w, "repository unavailable", http.StatusInternalServerError)
		return
	}

	switch gitSuffix {
	case "info/refs":
		h.handleInfoRefs(w, r, repo, user, proj)
	case "git-upload-pack":
		h.handleUploadPack(w, r, repo)
	case "git-receive-pack":
		h.handleReceivePack(w, r, repo)
	default:
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

func (h *GitHandler) handleInfoRefs(w http.ResponseWriter, r *http.Request, repo *git.Repository, user *security.User, proj *project.Project) {
	service := r.URL.Query().Get("service")
	if service == "" {
		// Dumb HTTP — not supported.
		http.Error(w, "dumb HTTP protocol not supported", http.StatusForbidden)
		return
	}

	switch service {
	case "git-upload-pack":
		// Fetch/clone — any reader can access.
	case "git-receive-pack":
		// Push requires owner permission.
		if ok, err := h.Security.IsProjectOwner(r.Context(), user.ID, proj.ID); err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		} else if !ok {
			http.Error(w, "you do not have permission to push to this project", http.StatusForbidden)
			return
		}
	default:
		http.Error(w, "unknown git service: "+service, http.StatusBadRequest)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")

	// Write the smart-HTTP service header.
	writePktLine(w, "# service="+service+"\n")
	writeFlushPkt(w)

	// Advertise refs using go-git.
	if err := repo.AdvertiseRefs(w, service); err != nil {
		slog.Error("advertise refs failed", "service", service, "error", err)
		return
	}
}

// ---------- git-upload-pack (fetch / clone) ----------

func (h *GitHandler) handleUploadPack(w http.ResponseWriter, r *http.Request, repo *git.Repository) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-upload-pack-result")

	if err := repo.UploadPack(w, r.Body); err != nil {
		slog.Error("upload-pack failed", "error", err)
		return
	}
}

// ---------- git-receive-pack (push) ----------

// handleReceivePack delegates to native "git receive-pack --stateless-rpc".
// go-git's server-side receive-pack has known issues; see protocol.go.
func (h *GitHandler) handleReceivePack(w http.ResponseWriter, r *http.Request, repo *git.Repository) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-receive-pack-result")

	if err := repo.ReceivePack(w, r.Body); err != nil {
		slog.Error("receive-pack failed", "error", err)
		return
	}
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

	slog.Info("lazy-initialized bare git repository", "gitDir", gitDir)
	return nil
}

func (h *GitHandler) authenticateGit(r *http.Request) (*security.User, error) {
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
