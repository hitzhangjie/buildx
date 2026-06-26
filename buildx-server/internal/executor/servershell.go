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

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
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

// IsApplicable is the fallback when no docker/remote executor matches.
func (e *ServerShellExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	if jobCtx == nil {
		return true
	}
	if jobCtx.AgentID > 0 {
		return false
	}
	if jobCtx.PreferredExecutor != "" && jobCtx.PreferredExecutor != "server-shell" {
		return false
	}
	return true
}

// Execute runs shell commands in the build work directory (legacy flat API).
func (e *ServerShellExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	return e.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

// ExecutePlan traverses a compiled Action plan and runs supported leaf steps.
func (e *ServerShellExecutor) ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error) {
	if plan == nil || plan.Root == nil {
		return []StepResult{}, nil
	}

	workDir := e.buildWorkDir(jobCtx)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, fmt.Errorf("create work dir %s: %w", workDir, err)
	}
	if logger != nil {
		logger.Log("info", "workDir: "+workDir)
	}

	results, err := ExecutePlanOnShell(ctx, jobCtx, plan, e, logger)
	return results, err
}

// RunCommand implements execplan.ShellRunner.
func (e *ServerShellExecutor) RunCommand(
	ctx context.Context,
	jobCtx *JobContext,
	stepName string,
	cmd *execplan.CommandFacade,
	position []int,
	logger TaskLogger,
) (execplan.LeafResult, error) {
	workDir := e.buildWorkDir(jobCtx)
	index := stepIndex(position)
	result := e.runScript(ctx, jobCtx, workDir, index, cmd.Commands, cmd.EnvVars, logger)
	result.Name = stepName
	return execplan.LeafResult{
		StepResultName: result.Name,
		Success:        result.Success,
		ExitCode:       result.ExitCode,
		DurationMs:     result.DurationMs,
		Error:          result.Error,
	}, nil
}

func stepIndex(position []int) int {
	if len(position) == 0 {
		return 0
	}
	return position[len(position)-1]
}

// runScript writes a single command to a temp script file and executes it.
func (e *ServerShellExecutor) runScript(ctx context.Context, jobCtx *JobContext, workDir string, index int, cmdText string, stepEnv map[string]string, logger TaskLogger) StepResult {
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
	result := e.runShellCommand(ctx, jobCtx, workDir, scriptPath, stepName, stepEnv, logger)
	result.DurationMs = time.Since(start).Milliseconds()
	return result
}

// runShellCommand executes a shell script via /bin/sh and streams output.
func (e *ServerShellExecutor) runShellCommand(ctx context.Context, jobCtx *JobContext, workDir, scriptPath, stepName string, stepEnv map[string]string, logger TaskLogger) StepResult {
	// Build a derived context with timeout if set.
	execCtx := ctx
	if jobCtx.Timeout > 0 {
		var cancel context.CancelFunc
		execCtx, cancel = context.WithTimeout(ctx, time.Duration(jobCtx.Timeout)*time.Second)
		defer cancel()
	}

	cmd := exec.CommandContext(execCtx, "/bin/sh", scriptPath)
	cmd.Dir = workDir

	// Set up the environment: inherit current env, overlay job and step env vars.
	mergedEnv := mergeEnv(jobCtx.EnvVars, stepEnv)
	cmd.Env = append(os.Environ(), envSlice(mergedEnv)...)

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
	return BuildWorkDir(e.workDirBase, jobCtx)
}

// WorkDirFor returns the job work directory path (public accessor for job service).
func (e *ServerShellExecutor) WorkDirFor(jobCtx *JobContext) string {
	return e.buildWorkDir(jobCtx)
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

func mergeEnv(base, overlay map[string]string) map[string]string {
	if len(base) == 0 && len(overlay) == 0 {
		return nil
	}
	out := make(map[string]string, len(base)+len(overlay))
	for k, v := range base {
		out[k] = v
	}
	for k, v := range overlay {
		out[k] = v
	}
	return out
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
