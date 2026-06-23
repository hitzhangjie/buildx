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
	switch {
	case suffix == "info/refs":
		return true
	case suffix == "git-upload-pack":
		return true
	case suffix == "git-receive-pack":
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

	// Ensure the bare git repository exists. This handles edge cases
	// where the project was created but git init failed or was skipped.
	if err := h.ensureGitRepo(gitDir); err != nil {
		slog.Error("failed to ensure git repository", "gitDir", gitDir, "error", err)
		http.Error(w, "repository unavailable", http.StatusInternalServerError)
		return
	}

	switch gitSuffix {
	case "info/refs":
		h.handleInfoRefs(w, r, gitDir, user, proj)
	case "git-upload-pack":
		h.handleUploadPack(w, r, gitDir)
	case "git-receive-pack":
		h.handleReceivePack(w, r, gitDir)
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

func (h *GitHandler) handleInfoRefs(w http.ResponseWriter, r *http.Request, gitDir string, user *security.User, proj *project.Project) {
	service := r.URL.Query().Get("service")
	if service == "" {
		// Dumb HTTP — not supported; return 403 to force smart HTTP.
		http.Error(w, "dumb HTTP protocol not supported", http.StatusForbidden)
		return
	}

	var gitCmd string
	switch service {
	case "git-upload-pack":
		gitCmd = "git-upload-pack"
	case "git-receive-pack":
		gitCmd = "git-receive-pack"
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

	// Validate git directory exists before advertising refs.
	if _, err := os.Stat(gitDir); err != nil {
		slog.Error("git directory not found", "gitDir", gitDir, "error", err)
		http.Error(w, "repository not found", http.StatusNotFound)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")

	// Write pkt-line header.
	writePktLine(w, "# service="+service+"\n")
	writeFlushPkt(w)

	// Advertise refs. Capture stderr separately — merging it into stdout
	// would corrupt the pkt-line stream when git errors.
	// Use "." as the repo path since cmd.Dir is already set to gitDir.
	// Passing a relative gitDir would double-resolve against CWD and fail.
	var stderr bytes.Buffer
	cmd := git.Cmd(gitDir, gitCmd[4:], "--advertise-refs", "--stateless-rpc", ".")
	cmd.Stdout = w
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		slog.Error("git advertise-refs failed",
			"gitDir", gitDir,
			"service", gitCmd,
			"error", err,
			"stderr", stderr.String(),
		)
		// Client will see truncated pkt-line output, but at least we log the
		// real cause server-side instead of corrupting the protocol stream.
		return
	}
}

// ---------- git-upload-pack (fetch / clone) ----------

func (h *GitHandler) handleUploadPack(w http.ResponseWriter, r *http.Request, gitDir string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-upload-pack-result")

	var stderr bytes.Buffer
	cmd := git.Cmd(gitDir, "upload-pack", "--stateless-rpc", ".")
	cmd.Stdin = r.Body
	cmd.Stdout = w
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		slog.Error("git upload-pack failed",
			"gitDir", gitDir,
			"error", err,
			"stderr", stderr.String(),
		)
		return
	}
}

// ---------- git-receive-pack (push) ----------

func (h *GitHandler) handleReceivePack(w http.ResponseWriter, r *http.Request, gitDir string) {
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	doNotCache(w)
	w.Header().Set("Content-Type", "application/x-git-receive-pack-result")

	var stderr bytes.Buffer
	cmd := git.Cmd(gitDir, "receive-pack", "--stateless-rpc", ".")
	cmd.Stdin = r.Body
	cmd.Stdout = w
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		slog.Error("git receive-pack failed",
			"gitDir", gitDir,
			"error", err,
			"stderr", stderr.String(),
		)
		return
	}
}

// ---------- helpers ----------

// ensureGitRepo checks that a bare git repository exists at gitDir,
// creating it if necessary. This provides resilience against project
// creation ordering bugs and manual filesystem changes.
func (h *GitHandler) ensureGitRepo(gitDir string) error {
	// Check if HEAD exists — the minimal marker of a valid git repo.
	headPath := gitDir + "/HEAD"
	if _, err := os.Stat(headPath); err == nil {
		return nil // already a valid repo
	}

	// Create directory and init bare repo.
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		return fmt.Errorf("mkdir git dir: %w", err)
	}

	cmd := git.Cmd(gitDir, "init", "--bare", gitDir)
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("git init --bare: %w: %s", err, stderr.String())
	}

	slog.Info("lazy-initialized bare git repository", "gitDir", gitDir)
	return nil
}

func (h *GitHandler) authenticateGit(r *http.Request) (*security.User, error) {
	// Git clients use HTTP Basic Auth.
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	// Also support Bearer token (personal access token as password in Basic Auth
	// is handled by Authenticate; standalone Bearer is used by some clients).
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])
		return h.Security.AuthenticateToken(r.Context(), token)
	}
	return nil, security.ErrUnauthorized
}

func (h *GitHandler) writeGitError(w http.ResponseWriter, r *http.Request, err error) {
	w.Header().Set("Content-Type", "text/plain")
	// Git clients expect 401 with Basic realm for authentication prompt.
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
	length := 4 + len(data) // 4 hex chars + data
	fmt.Fprintf(w, "%04x%s", length, data)
}

// writeFlushPkt writes a Git flush packet ("0000").
func writeFlushPkt(w io.Writer) {
	_, _ = w.Write([]byte("0000"))
}


