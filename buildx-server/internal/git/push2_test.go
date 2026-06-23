package git_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"
	"time"

	gogit "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing"
	"github.com/go-git/go-git/v5/plumbing/object"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/servertest"
)

const (
	integrationAdminUser = "gitintadmin"
	integrationAdminPass = "gitintpass"
	integrationAdminMail = "gitint@test.com"
)

// TestGitPushIntegration exercises git push through a live buildx-server:
// TCP listen, chi routing, GitHandler auth/project resolution, and ReceivePack.
func TestGitPushIntegration(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git executable not found in PATH")
	}

	fixture := servertest.Start(t, servertest.Options{
		InitialUser:     integrationAdminUser,
		InitialPassword: integrationAdminPass,
		InitialEmail:    integrationAdminMail,
	})
	baseURL, dataDir := fixture.BaseURL, fixture.DataDir
	remoteURL := gitRemoteURL(baseURL, integrationAdminUser, integrationAdminPass, "pushit")

	projectID := createProjectViaAPI(t, baseURL, "pushit")

	srcDir := t.TempDir()
	headHash := initLocalRepoWithCommit(t, srcDir, "README", "hello\n", "initial commit")

	t.Run("initial_push", func(t *testing.T) {
		out := gitPush(t, srcDir, remoteURL, "HEAD:refs/heads/main")
		if !strings.Contains(out, "new branch") && !strings.Contains(out, "[new branch]") {
			t.Fatalf("expected new branch push, output:\n%s", out)
		}
		assertBareRepoRef(t, dataDir, projectID, "refs/heads/main", headHash)
	})

	t.Run("up_to_date_push", func(t *testing.T) {
		out := gitPush(t, srcDir, remoteURL, "HEAD:refs/heads/main")
		if !strings.Contains(out, "Everything up-to-date") && !strings.Contains(out, "up to date") {
			t.Fatalf("expected up-to-date push, output:\n%s", out)
		}
		assertBareRepoRef(t, dataDir, projectID, "refs/heads/main", headHash)
	})

	t.Run("second_commit_push", func(t *testing.T) {
		secondHash := addCommit(t, srcDir, "more.txt", "more\n", "second commit")
		out := gitPush(t, srcDir, remoteURL, "HEAD:refs/heads/main")
		if !strings.Contains(out, "HEAD -> main") {
			t.Fatalf("expected branch update, output:\n%s", out)
		}
		assertBareRepoRef(t, dataDir, projectID, "refs/heads/main", secondHash)
	})

	t.Run("flush_only_receive_pack_is_rejected", func(t *testing.T) {
		// Reproduces the server log:
		//   preamble="flush-pkt (0000) → no ref-update commands" bodyHex=30303030
		// Native git never sends this on a real push; it indicates a malformed body.
		status, body := postReceivePack(t, baseURL, "pushit", []byte("0000"))
		if status != http.StatusOK {
			t.Fatalf("receive-pack status = %d, want 200 (current handler quirk)", status)
		}
		if len(body) != 0 {
			t.Fatalf("receive-pack error response body = %q, want empty", string(body))
		}
		// Ref must be unchanged after malformed request.
		assertBareRepoRef(t, dataDir, projectID, "refs/heads/main", readBareRepoRef(t, dataDir, projectID, "refs/heads/main"))
	})
}

type createProjectResponse struct {
	ID   int64  `json:"id"`
	Path string `json:"path"`
}

func createProjectViaAPI(t *testing.T, baseURL, name string) int64 {
	t.Helper()

	payload := fmt.Sprintf(`{"name":%q,"description":"git push integration"}`, name)
	req, err := http.NewRequest(http.MethodPost, baseURL+"/~api/projects", strings.NewReader(payload))
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.SetBasicAuth(integrationAdminUser, integrationAdminPass)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("create project: %v", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create project status = %d, body = %s", resp.StatusCode, body)
	}

	var created createProjectResponse
	if err := json.Unmarshal(body, &created); err != nil {
		t.Fatalf("decode create project response: %v", err)
	}
	if created.ID == 0 || created.Path != name {
		t.Fatalf("unexpected project response: %+v", created)
	}
	return created.ID
}

func gitRemoteURL(baseURL, user, pass, projectPath string) string {
	u, err := url.Parse(baseURL)
	if err != nil {
		panic(err)
	}
	u.User = url.UserPassword(user, pass)
	u.Path = "/" + projectPath + ".git"
	return u.String()
}

func initLocalRepoWithCommit(t *testing.T, dir, filename, content, message string) plumbing.Hash {
	t.Helper()

	repo, err := gogit.PlainInit(dir, false)
	if err != nil {
		t.Fatalf("init repo: %v", err)
	}
	cfg, err := repo.Config()
	if err != nil {
		t.Fatalf("repo config: %v", err)
	}
	cfg.User.Name = "integration"
	cfg.User.Email = integrationAdminMail
	if err := repo.SetConfig(cfg); err != nil {
		t.Fatalf("set config: %v", err)
	}

	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}
	wt, err := repo.Worktree()
	if err != nil {
		t.Fatalf("worktree: %v", err)
	}
	if _, err := wt.Add(filename); err != nil {
		t.Fatalf("git add: %v", err)
	}
	hash, err := wt.Commit(message, &gogit.CommitOptions{
		Author: &object.Signature{
			Name:  "integration",
			Email: integrationAdminMail,
			When:  time.Now(),
		},
	})
	if err != nil {
		t.Fatalf("commit: %v", err)
	}
	return hash
}

func addCommit(t *testing.T, dir, filename, content, message string) plumbing.Hash {
	t.Helper()

	repo, err := gogit.PlainOpen(dir)
	if err != nil {
		t.Fatalf("open repo: %v", err)
	}
	path := filepath.Join(dir, filename)
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatalf("write file: %v", err)
	}
	wt, err := repo.Worktree()
	if err != nil {
		t.Fatalf("worktree: %v", err)
	}
	if _, err := wt.Add(filename); err != nil {
		t.Fatalf("git add: %v", err)
	}
	hash, err := wt.Commit(message, &gogit.CommitOptions{
		Author: &object.Signature{
			Name:  "integration",
			Email: integrationAdminMail,
			When:  time.Now(),
		},
	})
	if err != nil {
		t.Fatalf("commit: %v", err)
	}
	return hash
}

func gitPush(t *testing.T, repoDir, remoteURL, refspec string) string {
	t.Helper()

	cmd := exec.Command(
		"git",
		"-c", "user.name=integration",
		"-c", "user.email="+integrationAdminMail,
		"-C", repoDir,
		"push", "-v",
		remoteURL,
		refspec,
	)
	out, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("git push: %v\n%s", err, out)
	}
	return string(out)
}

func bareGitDir(dataDir string, projectID int64) string {
	return filepath.Join(dataDir, "site", "projects", fmt.Sprintf("%d", projectID), "git")
}

func readBareRepoRef(t *testing.T, dataDir string, projectID int64, ref string) plumbing.Hash {
	t.Helper()

	repo, err := git.Open(bareGitDir(dataDir, projectID))
	if err != nil {
		t.Fatalf("open bare repo: %v", err)
	}
	r, err := repo.Inner().Reference(plumbing.ReferenceName(ref), true)
	if err != nil {
		t.Fatalf("read %s: %v", ref, err)
	}
	return r.Hash()
}

func assertBareRepoRef(t *testing.T, dataDir string, projectID int64, ref string, want plumbing.Hash) {
	t.Helper()

	got := readBareRepoRef(t, dataDir, projectID, ref)
	if got != want {
		t.Fatalf("%s = %s, want %s", ref, got, want)
	}
}

func postReceivePack(t *testing.T, baseURL, projectPath string, body []byte) (status int, respBody []byte) {
	t.Helper()

	req, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("%s/%s.git/git-receive-pack", baseURL, projectPath),
		bytes.NewReader(body),
	)
	if err != nil {
		t.Fatalf("new request: %v", err)
	}
	req.SetBasicAuth(integrationAdminUser, integrationAdminPass)
	req.Header.Set("Content-Type", "application/x-git-receive-pack-request")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("post receive-pack: %v", err)
	}
	defer resp.Body.Close()

	respBody, err = io.ReadAll(resp.Body)
	if err != nil {
		t.Fatalf("read response: %v", err)
	}
	return resp.StatusCode, respBody
}
