package git

import (
	"fmt"
	"io"
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
	// LogLine streams command output lines to the build log. stderr is true for stderr output.
	LogLine func(line string, stderr bool)
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
	if opts.CloneDepth > 0 {
		// Shallow clone only fetches the default branch tip; fetch the build commit explicitly.
		if err := runGitCommand(opts.LogLine, "init", workDir); err != nil {
			return fmt.Errorf("git init: %w", err)
		}
		if err := runGitCommand(opts.LogLine, "-C", workDir, "remote", "add", "origin", cloneURL); err != nil {
			return fmt.Errorf("git remote add: %w", err)
		}
		fetchArgs := []string{
			"-C", workDir, "fetch",
			"--depth", fmt.Sprintf("%d", opts.CloneDepth),
			"origin", commitHash,
		}
		if err := runGitCommand(opts.LogLine, fetchArgs...); err != nil {
			return fmt.Errorf("git fetch: %w", err)
		}
	} else {
		cloneArgs := []string{"clone", "--no-checkout", cloneURL, workDir}
		if err := runGitCommand(opts.LogLine, cloneArgs...); err != nil {
			return fmt.Errorf("git clone: %w", err)
		}
	}

	checkoutArgs := []string{"-C", workDir, "checkout", commitHash}
	if err := runGitCommand(opts.LogLine, checkoutArgs...); err != nil {
		return fmt.Errorf("git checkout: %w", err)
	}

	if opts.WithSubmodules {
		subArgs := []string{"-C", workDir, "submodule", "update", "--init", "--recursive"}
		if err := runGitCommand(opts.LogLine, subArgs...); err != nil {
			return fmt.Errorf("git submodule: %w", err)
		}
	}
	if opts.WithLFS {
		lfsArgs := []string{"-C", workDir, "lfs", "pull"}
		if err := runGitCommand(opts.LogLine, lfsArgs...); err != nil {
			return fmt.Errorf("git lfs pull: %w", err)
		}
	}
	return nil
}

func runGitCommand(logLine func(string, bool), args ...string) error {
	if logLine != nil {
		logLine("+ git "+strings.Join(args, " "), false)
	}

	cmd := exec.Command("git", args...)
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return err
	}

	if err := cmd.Start(); err != nil {
		return err
	}

	var stdoutDone, stderrDone chan struct{}
	if logLine != nil {
		stdoutDone = streamCommandOutput(stdout, false, logLine)
		stderrDone = streamCommandOutput(stderr, true, logLine)
	} else {
		stdoutDone = drainReader(stdout)
		stderrDone = drainReader(stderr)
	}

	<-stdoutDone
	<-stderrDone
	return cmd.Wait()
}

func streamCommandOutput(reader io.Reader, stderr bool, logLine func(string, bool)) chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		buf := make([]byte, 4096)
		var remainder string
		for {
			n, err := reader.Read(buf)
			if n > 0 {
				content := remainder + string(buf[:n])
				lines := strings.Split(content, "\n")
				for i := 0; i < len(lines)-1; i++ {
					if line := strings.TrimRight(lines[i], "\r"); line != "" {
						logLine(line, stderr)
					}
				}
				remainder = lines[len(lines)-1]
			}
			if err != nil {
				if remainder != "" {
					if line := strings.TrimRight(remainder, "\r"); line != "" {
						logLine(line, stderr)
					}
				}
				return
			}
		}
	}()
	return done
}

func drainReader(reader io.Reader) chan struct{} {
	done := make(chan struct{})
	go func() {
		defer close(done)
		_, _ = io.Copy(io.Discard, reader)
	}()
	return done
}
