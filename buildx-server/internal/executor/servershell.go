package executor

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"
)

// ServerShellExecutor runs job commands via local shell on the server.
// It maps to OneDev's ServerShellExecutor and serves as the simplest execution
// backend, suitable for lightweight CI jobs that run directly on the build
// server host.
type ServerShellExecutor struct {
	config      ExecutorConfig
	workDirBase string // base path for build work directories, e.g., "data/builds"
}

// NewServerShellExecutor creates a ServerShellExecutor that places work
// directories under workDirBase. The workDirBase should be an absolute path
// (e.g., filepath.Join(dataDir, "builds")).
func NewServerShellExecutor(workDirBase string) *ServerShellExecutor {
	return &ServerShellExecutor{
		config: ExecutorConfig{
			Name:    "server-shell",
			Enabled: true,
		},
		workDirBase: workDirBase,
	}
}

// Name returns the executor name.
func (e *ServerShellExecutor) Name() string {
	return "server-shell"
}

// Enabled returns whether this executor is enabled.
func (e *ServerShellExecutor) Enabled() bool {
	return e.config.Enabled
}

// SupportsHTMLReports returns true; server-shell can serve HTML reports from the
// work directory via the web server.
func (e *ServerShellExecutor) SupportsHTMLReports() bool {
	return e.config.HTMLReportEnabled
}

// SupportsSitePublishing returns true; server-shell can expose static site
// content from the work directory.
func (e *ServerShellExecutor) SupportsSitePublishing() bool {
	return e.config.SitePublishEnabled
}

// IsApplicable always returns true as a last-resort fallback. When no more
// specific executor matches (e.g., remote-shell or kubernetes), the server-shell
// executor is used for jobs configured to run on the server.
func (e *ServerShellExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	return true
}

// Execute runs shell commands in the build work directory.
//
// For each command string:
//  1. The command is written to a temporary shell script inside the work dir.
//  2. It is executed with /bin/sh -e {script}.sh under the build work directory.
//  3. stdout and stderr are captured and streamed to the TaskLogger.
//  4. The exit code and duration are recorded in the StepResult.
//
// The work directory is created at {workDirBase}/{projectId}/{buildNumber}/.
func (e *ServerShellExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	if len(commands) == 0 {
		return []StepResult{}, nil
	}

	workDir := e.buildWorkDir(jobCtx)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, fmt.Errorf("create work dir %s: %w", workDir, err)
	}

	if logger != nil {
		logger.Log("info", "workDir: "+workDir)
	}

	results := make([]StepResult, 0, len(commands))

	for i, cmdText := range commands {
		select {
		case <-ctx.Done():
			return results, ctx.Err()
		default:
		}

		cmdText = strings.TrimSpace(cmdText)
		if cmdText == "" {
			results = append(results, StepResult{
				Name:    fmt.Sprintf("step-%d", i+1),
				Success: true,
			})
			continue
		}

		result := e.runScript(ctx, jobCtx, workDir, i, cmdText, logger)
		results = append(results, result)

		// Stop on first failure when shell -e semantics apply.
		if !result.Success && result.ExitCode != 0 {
			break
		}
	}

	return results, nil
}

// runScript writes a single command to a temp script file and executes it.
func (e *ServerShellExecutor) runScript(ctx context.Context, jobCtx *JobContext, workDir string, index int, cmdText string, logger TaskLogger) StepResult {
	stepName := fmt.Sprintf("step-%d", index+1)
	scriptPath := filepath.Join(workDir, fmt.Sprintf("step-%d.sh", index+1))

	// Write the shell script with the command.
	script := fmt.Sprintf("#!/bin/sh -e\n%s\n", cmdText)
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return StepResult{
			Name:    stepName,
			Success: false,
			Error:   fmt.Sprintf("write script: %v", err),
		}
	}
	defer os.Remove(scriptPath)

	start := time.Now()
	result := e.runShellCommand(ctx, jobCtx, workDir, scriptPath, stepName, logger)
	result.DurationMs = time.Since(start).Milliseconds()
	return result
}

// runShellCommand executes a shell script via /bin/sh and streams output.
func (e *ServerShellExecutor) runShellCommand(ctx context.Context, jobCtx *JobContext, workDir, scriptPath, stepName string, logger TaskLogger) StepResult {
	// Build a derived context with timeout if set.
	execCtx := ctx
	if jobCtx.Timeout > 0 {
		var cancel context.CancelFunc
		execCtx, cancel = context.WithTimeout(ctx, time.Duration(jobCtx.Timeout)*time.Second)
		defer cancel()
	}

	cmd := exec.CommandContext(execCtx, "/bin/sh", scriptPath)
	cmd.Dir = workDir

	// Set up the environment: inherit current env, overlay job env vars.
	cmd.Env = append(os.Environ(), envSlice(jobCtx.EnvVars)...)

	// Create pipes for stdout and stderr.
	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return StepResult{
			Name:    stepName,
			Success: false,
			Error:   fmt.Sprintf("stdout pipe: %v", err),
		}
	}
	stderr, err := cmd.StderrPipe()
	if err != nil {
		return StepResult{
			Name:    stepName,
			Success: false,
			Error:   fmt.Sprintf("stderr pipe: %v", err),
		}
	}

	if err := cmd.Start(); err != nil {
		return StepResult{
			Name:    stepName,
			Success: false,
			Error:   fmt.Sprintf("start command: %v", err),
		}
	}

	// Stream stdout and stderr concurrently.
	var stdoutDone, stderrDone chan struct{}

	if logger != nil {
		stdoutDone = streamOutput(stdout, func(line string) {
			logger.Stdout(line)
		})
		stderrDone = streamOutput(stderr, func(line string) {
			logger.Stderr(line)
		})
	}

	// Wait for output streaming to complete.
	if stdoutDone != nil {
		<-stdoutDone
	}
	if stderrDone != nil {
		<-stderrDone
	}

	// Wait for the command to finish and capture the exit code.
	err = cmd.Wait()
	exitCode := exitCodeFromError(err)

	result := StepResult{
		Name:     stepName,
		Success:  exitCode == 0,
		ExitCode: exitCode,
	}

	if err != nil && exitCode == -1 {
		// Command could not start or was killed by a signal.
		if execCtx.Err() != nil {
			result.Error = "cancelled"
		} else {
			result.Error = err.Error()
		}
	}

	return result
}

// buildWorkDir returns the work directory path for a job context.
func (e *ServerShellExecutor) buildWorkDir(jobCtx *JobContext) string {
	return filepath.Join(e.workDirBase, fmt.Sprintf("%d", jobCtx.ProjectID), fmt.Sprintf("%d", jobCtx.BuildNumber))
}

// streamOutput reads lines from reader and sends them to the callback function
// via a goroutine. It returns a channel that is closed when reading is complete.
func streamOutput(reader io.Reader, callback func(string)) chan struct{} {
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
				// The last element may be incomplete; save it as remainder.
				for i := 0; i < len(lines)-1; i++ {
					callback(lines[i])
				}
				remainder = lines[len(lines)-1]
			}
			if err != nil {
				if remainder != "" {
					callback(remainder)
				}
				return
			}
		}
	}()
	return done
}

// envSlice converts a map of environment variables to a slice of "key=value" strings.
func envSlice(env map[string]string) []string {
	if len(env) == 0 {
		return nil
	}
	s := make([]string, 0, len(env))
	for k, v := range env {
		s = append(s, k+"="+v)
	}
	return s
}

// exitCodeFromError extracts the exit code from an exec.ExitError.
// Returns 0 if err is nil, or -1 if the error is not an ExitError.
func exitCodeFromError(err error) int {
	if err == nil {
		return 0
	}
	var exitErr *exec.ExitError
	if errors.As(err, &exitErr) {
		return exitErr.ExitCode()
	}
	return -1
}
