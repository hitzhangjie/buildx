package executor

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// RunCacheHandler implements CacheHandler using internal/cache.Service.
type RunCacheHandler struct {
	Cache *cache.Service
}

func (h *RunCacheHandler) SetupCache(ctx context.Context, jobCtx *JobContext, facade *execplan.SetupCacheFacade, workDir string, logger TaskLogger) error {
	if h == nil || h.Cache == nil || facade == nil {
		return nil
	}
	checksum, err := cache.ChecksumFiles(workDir, facade.ChecksumFiles)
	if err != nil {
		return err
	}
	archive := h.Cache.FindExact(jobCtx.ProjectID, facade.Key, checksum)
	if archive == "" {
		archive = h.Cache.FindPartial(jobCtx.ProjectID, facade.Key)
		if archive != "" && logger != nil {
			logger.Log("info", "restoring partial cache match for key "+facade.Key)
		}
	} else if logger != nil {
		logger.Log("info", "restoring exact cache match for key "+facade.Key)
	}
	if archive == "" {
		if logger != nil {
			logger.Log("info", "no cache found for key "+facade.Key)
		}
		return nil
	}
	return h.Cache.Restore(archive, workDir, facade.Paths)
}

func (h *RunCacheHandler) SaveCache(ctx context.Context, jobCtx *JobContext, facade *execplan.SetupCacheFacade, workDir, checksum string) error {
	if h == nil || h.Cache == nil || facade == nil {
		return nil
	}
	strategy := facade.UploadStrategy
	if strategy == "" || strategy == "UPLOAD_IF_NOT_EXACT_MATCH" {
		if h.Cache.FindExact(jobCtx.ProjectID, facade.Key, checksum) != "" {
			return nil
		}
	}
	_, err := h.Cache.Save(jobCtx.ProjectID, facade.Key, checksum, workDir, facade.Paths)
	return err
}

// PlanExecConfig holds optional handlers for plan execution.
type PlanExecConfig struct {
	WorkDir     string
	GitDir      string
	ShellRunner PlanShellRunner
}

// ExecutePlanOnShell traverses a plan and runs supported leaf steps via a shell runner.
func ExecutePlanOnShell(
	ctx context.Context,
	jobCtx *JobContext,
	plan *execplan.Plan,
	runner PlanShellRunner,
	logger TaskLogger,
) ([]StepResult, error) {
	return executePlanOnShell(ctx, jobCtx, plan, runner, logger, PlanExecConfig{
		WorkDir:     workDirFor(jobCtx, runner),
		GitDir:      jobCtx.GitDir,
		ShellRunner: runner,
	})
}

func workDirFor(jobCtx *JobContext, runner PlanShellRunner) string {
	if sh, ok := runner.(*ServerShellExecutor); ok {
		return sh.buildWorkDir(jobCtx)
	}
	if jobCtx != nil && jobCtx.WorkDir != "" {
		return jobCtx.WorkDir
	}
	return ""
}

func executePlanOnShell(
	ctx context.Context,
	jobCtx *JobContext,
	plan *execplan.Plan,
	runner PlanShellRunner,
	logger TaskLogger,
	cfg PlanExecConfig,
) ([]StepResult, error) {
	if plan == nil || plan.Root == nil {
		return []StepResult{}, nil
	}

	// Track cache facades to upload after successful job (OneDev uploads on success).
	var pendingCache []*execplan.SetupCacheFacade
	var pendingChecksums = map[*execplan.SetupCacheFacade]string{}

	results, err := plan.Run(ctx, func(ctx context.Context, action execplan.Action, facade execplan.LeafFacade, position []int) (execplan.LeafResult, error) {
		switch f := facade.(type) {
		case *execplan.CommandFacade:
			if stringsTrim(f.Commands) == "" {
				return execplan.LeafResult{StepResultName: action.Name, Success: true, Skipped: true}, nil
			}
			if f.Image != "" {
				return execplan.LeafResult{
					StepResultName: action.Name,
					Success:        false,
					Error:          "container image steps require a docker-aware executor",
				}, nil
			}
			return runner.RunCommand(ctx, jobCtx, action.Name, f, position, logger)

		case *execplan.CheckoutFacade:
			if cfg.GitDir == "" {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: "git directory not configured"}, nil
			}
			if err := runCheckout(ctx, jobCtx, cfg.WorkDir, cfg.GitDir, f, logger); err != nil {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
			}
			return execplan.LeafResult{StepResultName: action.Name, Success: true}, nil

		case *execplan.SetupCacheFacade:
			if jobCtx != nil && jobCtx.Cache != nil {
				if err := jobCtx.Cache.SetupCache(ctx, jobCtx, f, cfg.WorkDir, logger); err != nil {
					return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
				}
				cs, _ := cacheChecksum(cfg.WorkDir, f.ChecksumFiles)
				pendingCache = append(pendingCache, f)
				pendingChecksums[f] = cs
			}
			return execplan.LeafResult{StepResultName: action.Name, Success: true}, nil

		case *execplan.RunContainerFacade:
			return execplan.LeafResult{
				StepResultName: action.Name,
				Success:        false,
				Error:          "run-container steps require a docker-aware executor (stub: use server-docker or kubernetes executor)",
			}, nil

		case *execplan.ServerSideFacade:
			if jobCtx != nil {
				jobCtx.CurrentStepPosition = append([]int(nil), position...)
			}
			res, err := RunServerStep(ctx, f.Step, jobCtx, cfg.WorkDir, logger)
			if err != nil {
				return execplan.LeafResult{StepResultName: action.Name, Success: false, Error: err.Error()}, nil
			}
			return execplan.LeafResult{
				StepResultName: action.Name,
				Success:        res.Success,
				Error:          res.Message,
			}, nil

		default:
			return execplan.LeafResult{}, fmt.Errorf("unsupported leaf facade %T", facade)
		}
	})
	if err != nil {
		return leafResultsToStepResults(results), err
	}

	// Upload caches when all steps succeeded.
	allOK := true
	for _, r := range results {
		if !r.Success && !r.Skipped {
			allOK = false
			break
		}
	}
	if allOK && jobCtx != nil && jobCtx.Cache != nil {
		for _, f := range pendingCache {
			_ = jobCtx.Cache.SaveCache(ctx, jobCtx, f, cfg.WorkDir, pendingChecksums[f])
		}
	}

	return leafResultsToStepResults(results), nil
}

func stringsTrim(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\n') {
		s = s[1:]
	}
	return s
}

func cacheChecksum(workDir, spec string) (string, error) {
	return cache.ChecksumFiles(workDir, spec)
}

func runCheckout(ctx context.Context, jobCtx *JobContext, workDir, gitDir string, f *execplan.CheckoutFacade, logger TaskLogger) error {
	if logger != nil {
		logger.Log("info", "checking out "+jobCtx.CommitHash)
	}
	if err := checkoutCommit(gitDir, workDir, jobCtx.CommitHash, f.WithLFS, f.WithSubmodules, f.CloneDepth, logger); err != nil {
		return err
	}
	if logger != nil {
		logger.Log("info", "checkout completed")
	}
	return nil
}

func leafResultsToStepResults(results []execplan.LeafResult) []StepResult {
	out := make([]StepResult, 0, len(results))
	for _, r := range results {
		if r.Skipped && r.StepResultName == "" {
			continue
		}
		out = append(out, StepResult{
			Name:       r.StepResultName,
			Success:    r.Success,
			ExitCode:   r.ExitCode,
			DurationMs: r.DurationMs,
			Error:      r.Error,
		})
	}
	return out
}
