package git

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// CheckoutOptions configures a CI checkout into a job work directory.
type CheckoutOptions struct {
	WithLFS        bool
	WithSubmodules bool
	CloneDepth     int
}

// CheckoutCommit clones a bare repository into workDir and checks out commitHash.
// Maps to OneDev CheckoutStep / CheckoutFacade execution.
func CheckoutCommit(repoPath, workDir, commitHash string, opts CheckoutOptions) error {
	if strings.TrimSpace(commitHash) == "" {
		return fmt.Errorf("commit hash is required")
	}
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return err
	}

	// Clean work dir except when reusing (OneDev tracks checkoutPaths).
	entries, _ := os.ReadDir(workDir)
	for _, e := range entries {
		_ = os.RemoveAll(filepath.Join(workDir, e.Name()))
	}

	cloneURL := "file://" + filepath.ToSlash(repoPath)
	args := []string{"clone", "--no-checkout"}
	if opts.CloneDepth > 0 {
		args = append(args, "--depth", fmt.Sprintf("%d", opts.CloneDepth))
	}
	args = append(args, cloneURL, workDir)

	if out, err := exec.Command("git", args...).CombinedOutput(); err != nil {
		return fmt.Errorf("git clone: %w: %s", err, strings.TrimSpace(string(out)))
	}

	checkoutArgs := []string{"-C", workDir, "checkout", commitHash}
	if out, err := exec.Command("git", checkoutArgs...).CombinedOutput(); err != nil {
		return fmt.Errorf("git checkout: %w: %s", err, strings.TrimSpace(string(out)))
	}

	if opts.WithSubmodules {
		if out, err := exec.Command("git", "-C", workDir, "submodule", "update", "--init", "--recursive").CombinedOutput(); err != nil {
			return fmt.Errorf("git submodule: %w: %s", err, strings.TrimSpace(string(out)))
		}
	}
	if opts.WithLFS {
		_ = exec.Command("git", "-C", workDir, "lfs", "pull").Run()
	}
	return nil
}
