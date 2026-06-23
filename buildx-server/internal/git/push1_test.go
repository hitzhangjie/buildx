package git

import (
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp"
	"github.com/go-git/go-git/v5/plumbing/protocol/packp/capability"
	"github.com/go-git/go-git/v5/plumbing/transport"
)

// TestReceivePackGoGit_NativeGitPush exercises push to a bare repo through
// ReceivePack (go-git) using a real git client over smart HTTP.
func TestReceivePackGoGit_NativeGitPush(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git executable not found in PATH")
	}

	headHash, bareDir, srcDir := newPushFixture(t)
	if err := pushViaGoGitHTTPServer(t, bareDir, srcDir, receivePackCapabilities()); err != nil {
		t.Fatalf("git push via go-git receive-pack failed: %v", err)
	}
	assertBareRepoMain(t, bareDir, headHash)
}

func newPushFixture(t *testing.T) (headHash plumbing.Hash, bareDir, srcDir string) {
	t.Helper()

	root := t.TempDir()
	bareDir = filepath.Join(root, "bare")
	srcDir = filepath.Join(root, "source")

	if err := InitBare(bareDir); err != nil {
		t.Fatalf("init bare repo: %v", err)
	}
	headHash = initSourceRepo(t, srcDir)
	return headHash, bareDir, srcDir
}

func pushViaGoGitHTTPServer(t *testing.T, bareDir, srcDir string, caps *capability.List) error {
	t.Helper()

	bareRepo, err := Open(bareDir)
	if err != nil {
		t.Fatalf("open bare repo: %v", err)
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/info/refs"):
			handleInfoRefsWithCaps(t, w, r, bareRepo, caps)
		case strings.HasSuffix(r.URL.Path, "/git-receive-pack"):
			handleReceivePack(t, w, r, bareRepo)
		default:
			http.NotFound(w, r)
		}
	}))
	defer srv.Close()

	pushURL := srv.URL + "/test.git"
	pushCmd := exec.Command(
		"git",
		"-c", "user.name=test",
		"-c", "user.email=test@example.com",
		"-C", srcDir,
		"push", pushURL, "HEAD:refs/heads/main",
	)
	out, err := pushCmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func assertBareRepoMain(t *testing.T, bareDir string, want plumbing.Hash) {
	t.Helper()

	opened, err := Open(bareDir)
	if err != nil {
		t.Fatalf("reopen bare repo: %v", err)
	}
	if !opened.HasRefs() {
		t.Fatal("bare repo has no refs after go-git receive-pack push")
	}

	ref, err := opened.Inner().Reference("refs/heads/main", true)
	if err != nil {
		t.Fatalf("read refs/heads/main: %v", err)
	}
	if ref.Hash() != want {
		t.Fatalf("refs/heads/main = %s, want %s", ref.Hash(), want)
	}
}

func initSourceRepo(t *testing.T, dir string) plumbing.Hash {
	t.Helper()

	repo, err := gogit.PlainInit(dir, false)
	if err != nil {
		t.Fatalf("init source repo: %v", err)
	}

	cfg, err := repo.Config()
	if err != nil {
		t.Fatalf("read source repo config: %v", err)
	}
	cfg.User.Name = "test"
	cfg.User.Email = "test@example.com"
	if err := repo.SetConfig(cfg); err != nil {
		t.Fatalf("set source repo config: %v", err)
	}

	readme := filepath.Join(dir, "README")
	if err := os.WriteFile(readme, []byte("hello\n"), 0o644); err != nil {
		t.Fatalf("write README: %v", err)
	}

	wt, err := repo.Worktree()
	if err != nil {
		t.Fatalf("worktree: %v", err)
	}
	if _, err := wt.Add("README"); err != nil {
		t.Fatalf("git add: %v", err)
	}

	hash, err := wt.Commit("initial commit", &gogit.CommitOptions{
		Author: &object.Signature{
			Name:  "test",
			Email: "test@example.com",
			When:  time.Now(),
		},
	})
	if err != nil {
		t.Fatalf("commit: %v", err)
	}
	return hash
}

func handleInfoRefsWithCaps(t *testing.T, w http.ResponseWriter, r *http.Request, repo *Repository, caps *capability.List) {
	t.Helper()

	service := r.URL.Query().Get("service")
	if service != transport.ReceivePackServiceName {
		http.Error(w, "only git-receive-pack supported in test", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/x-"+service+"-advertisement")
	if err := writePktLine(w, "# service="+service+"\n"); err != nil {
		t.Errorf("write service pkt-line: %v", err)
		return
	}
	if err := writeFlushPkt(w); err != nil {
		t.Errorf("write flush pkt: %v", err)
		return
	}
	if err := advertiseRefsWithCaps(w, repo, caps); err != nil {
		t.Errorf("advertise refs: %v", err)
	}
}

func advertiseRefsWithCaps(w io.Writer, repo *Repository, caps *capability.List) error {
	ar := packp.NewAdvRefs()
	ar.Capabilities = caps

	refs, err := repo.inner.References()
	if err != nil {
		return fmt.Errorf("iterate refs: %w", err)
	}
	defer refs.Close()

	for {
		ref, err := refs.Next()
		if err != nil {
			break
		}
		if err := ar.AddReference(ref); err != nil {
			continue
		}
	}

	head, err := repo.inner.Head()
	if err == nil && head.Name().IsBranch() {
		headHash := head.Hash()
		ar.Head = &headHash
	}

	return ar.Encode(w)
}

func handleReceivePack(t *testing.T, w http.ResponseWriter, r *http.Request, repo *Repository) {
	t.Helper()

	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	w.Header().Set("Content-Type", "application/x-git-receive-pack-result")
	if err := repo.ReceivePack(w, r.Body); err != nil {
		t.Errorf("receive-pack failed: %v", err)
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
}

func writePktLine(w io.Writer, data string) error {
	length := len(data) + 4
	_, err := fmt.Fprintf(w, "%04x%s", length, data)
	return err
}

func writeFlushPkt(w io.Writer) error {
	_, err := w.Write([]byte("0000"))
	return err
}
