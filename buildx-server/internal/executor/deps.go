package executor

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// ServerStepResult is returned by server-side step execution.
type ServerStepResult struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Outputs map[string]string `json:"outputs,omitempty"`
}

// PlanShellRunner runs a single command facade on the local shell.
type PlanShellRunner interface {
	RunCommand(
		ctx context.Context,
		jobCtx *JobContext,
		stepName string,
		cmd *execplan.CommandFacade,
		position []int,
		logger TaskLogger,
	) (execplan.LeafResult, error)
}

// ServerStepHandler runs server-side buildspec steps during plan execution.
type ServerStepHandler interface {
	RunServerStep(ctx context.Context, step buildspec.Step, jobCtx *JobContext, workDir string, logger TaskLogger) (*ServerStepResult, error)
}

// CacheHandler restores and saves job caches for SetupCacheStep.
type CacheHandler interface {
	SetupCache(ctx context.Context, jobCtx *JobContext, facade *execplan.SetupCacheFacade, workDir string, logger TaskLogger) error
	SaveCache(ctx context.Context, jobCtx *JobContext, facade *execplan.SetupCacheFacade, workDir string, checksum string) error
}
