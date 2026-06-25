package executor

import (
	"context"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// ExecutePlanOnDocker traverses a plan and runs docker-aware leaf steps.
func ExecutePlanOnDocker(
	ctx context.Context,
	jobCtx *JobContext,
	plan *execplan.Plan,
	workDir string,
	logger TaskLogger,
) ([]StepResult, error) {
	if plan == nil || plan.Root == nil {
		return []StepResult{}, nil
	}

	shellRunner := &ServerShellExecutor{workDirBase: workDir}

	var pendingCache []*execplan.SetupCacheFacade
	pendingChecksums := map[*execplan.SetupCacheFacade]string{}

	results, err := plan.Run(ctx, func(ctx context.Context, action execplan.Action, facade execplan.LeafFacade, position []int) (execplan.LeafResult, error) {
		switch f := facade.(type) {
		case *execplan.CommandFacade:
			if stringsTrim(f.Commands) == "" {
				return execplan.LeafResult{StepResultName: action.Name, Success: true, Skipped: true}, nil
			}
			if f.Image != "" {
				return runDockerCommand(ctx, jobCtx, workDir, action.Name, f.Image, f.Commands, f.EnvVars, logger)
			}
			return shellRunner.RunCommand(ctx, jobCtx, action.Name, f, position, logger)

		case *execplan.CheckoutFacade:
			if jobCtx.GitDir == "" {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: "git directory not configured"}, nil
			}
			if err := runCheckout(ctx, jobCtx, workDir, jobCtx.GitDir, f, logger); err != nil {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
			}
			return execplan.LeafResult{StepResultName: action.Name, Success: true}, nil

		case *execplan.SetupCacheFacade:
			if jobCtx != nil && jobCtx.Cache != nil {
				if err := jobCtx.Cache.SetupCache(ctx, jobCtx, f, workDir, logger); err != nil {
					return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
				}
				cs, _ := cacheChecksum(workDir, f.ChecksumFiles)
				pendingCache = append(pendingCache, f)
				pendingChecksums[f] = cs
			}
			return execplan.LeafResult{StepResultName: action.Name, Success: true}, nil

		case *execplan.RunContainerFacade:
			return runDockerCommand(ctx, jobCtx, workDir, action.Name, f.Image, f.Commands, f.EnvVars, logger)

		case *execplan.BuildImageFacade:
			return runDockerBuild(ctx, workDir, action.Name, f, logger)

		case *execplan.PullImageFacade:
			return runDockerPull(ctx, action.Name, f, logger)

		case *execplan.PushImageFacade:
			return runDockerPush(ctx, action.Name, f, logger)

		case *execplan.ServerSideFacade:
			res, err := RunServerStep(ctx, f.Step, jobCtx, workDir, logger)
			if err != nil {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
			}
			return execplan.LeafResult{StepResultName: action.Name, Success: res.Success, Error: res.Message}, nil

		default:
			return execplan.LeafResult{}, fmt.Errorf("unsupported leaf facade %T", facade)
		}
	})
	if err != nil {
		return leafResultsToStepResults(results), err
	}

	allOK := true
	for _, r := range results {
		if !r.Success && !r.Skipped {
			allOK = false
			break
		}
	}
	if allOK && jobCtx != nil && jobCtx.Cache != nil {
		for _, f := range pendingCache {
			_ = jobCtx.Cache.SaveCache(ctx, jobCtx, f, workDir, pendingChecksums[f])
		}
	}
	return leafResultsToStepResults(results), nil
}

func runDockerCommand(ctx context.Context, jobCtx *JobContext, workDir, stepName, image, commands string, env map[string]string, logger TaskLogger) (execplan.LeafResult, error) {
	start := time.Now()
	args := []string{"run", "--rm", "-v", workDir + ":/workspace", "-w", "/workspace"}
	for k, v := range mergeEnv(jobCtx.EnvVars, env) {
		args = append(args, "-e", k+"="+v)
	}
	args = append(args, image, "/bin/sh", "-ec", commands)
	if logger != nil {
		logger.Log("info", "docker run "+image)
	}
	cmd := exec.CommandContext(ctx, "docker", args...)
	out, err := cmd.CombinedOutput()
	if logger != nil && len(out) > 0 {
		logger.Stdout(string(out))
	}
	exitCode := exitCodeFromError(err)
	return execplan.LeafResult{
		StepResultName: stepName,
		Success:        exitCode == 0,
		ExitCode:       exitCode,
		DurationMs:     time.Since(start).Milliseconds(),
		Error:          dockerErr(err, out),
	}, nil
}

func runDockerBuild(ctx context.Context, workDir, stepName string, f *execplan.BuildImageFacade, logger TaskLogger) (execplan.LeafResult, error) {
	start := time.Now()
	contextPath := f.ContextPath
	if contextPath == "" {
		contextPath = "."
	}
	dockerfile := f.Dockerfile
	if dockerfile == "" {
		dockerfile = "Dockerfile"
	}
	args := []string{"build", "-f", dockerfile, contextPath}
	for _, tag := range f.Tags {
		args = append(args, "-t", tag)
	}
	for k, v := range f.BuildArgs {
		args = append(args, "--build-arg", k+"="+v)
	}
	cmd := exec.CommandContext(ctx, "docker", args...)
	cmd.Dir = workDir
	out, err := cmd.CombinedOutput()
	if logger != nil {
		logger.Stdout(string(out))
	}
	exitCode := exitCodeFromError(err)
	return execplan.LeafResult{
		StepResultName: stepName,
		Success:        exitCode == 0,
		ExitCode:       exitCode,
		DurationMs:     time.Since(start).Milliseconds(),
		Error:          dockerErr(err, out),
	}, nil
}

func runDockerPull(ctx context.Context, stepName string, f *execplan.PullImageFacade, logger TaskLogger) (execplan.LeafResult, error) {
	start := time.Now()
	for _, tag := range f.ImageTags {
		cmd := exec.CommandContext(ctx, "docker", "pull", tag)
		out, err := cmd.CombinedOutput()
		if logger != nil {
			logger.Stdout(string(out))
		}
		if err != nil {
			return execplan.LeafResult{
				StepResultName: stepName,
				Success:        false,
				Error:          dockerErr(err, out),
				DurationMs:     time.Since(start).Milliseconds(),
			}, nil
		}
	}
	return execplan.LeafResult{StepResultName: stepName, Success: true, DurationMs: time.Since(start).Milliseconds()}, nil
}

func runDockerPush(ctx context.Context, stepName string, f *execplan.PushImageFacade, logger TaskLogger) (execplan.LeafResult, error) {
	start := time.Now()
	for _, tag := range f.ImageTags {
		cmd := exec.CommandContext(ctx, "docker", "push", tag)
		out, err := cmd.CombinedOutput()
		if logger != nil {
			logger.Stdout(string(out))
		}
		if err != nil {
			return execplan.LeafResult{
				StepResultName: stepName,
				Success:        false,
				Error:          dockerErr(err, out),
				DurationMs:     time.Since(start).Milliseconds(),
			}, nil
		}
	}
	return execplan.LeafResult{StepResultName: stepName, Success: true, DurationMs: time.Since(start).Milliseconds()}, nil
}

func dockerErr(err error, out []byte) string {
	if err == nil {
		return ""
	}
	msg := strings.TrimSpace(string(out))
	if msg != "" {
		return msg
	}
	return err.Error()
}
