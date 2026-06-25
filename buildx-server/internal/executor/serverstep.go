package executor

import (
	"context"
	"fmt"
)

// ServerStepResult is returned by server-side step execution.
// These steps execute directly on the server (e.g., branch operations,
// pull request creation, version tagging) rather than on an agent.
type ServerStepResult struct {
	Success bool              `json:"success"`
	Message string            `json:"message"`
	Outputs map[string]string `json:"outputs,omitempty"`
}

// RunServerStep executes a single step on the server side.
// This maps to OneDev's JobService.runServerStep and handles steps that must
// run on the server rather than on a build agent, such as:
//   - CreateBranch / DeleteBranch
//   - CreatePullRequest / MergePullRequest
//   - SetBuildVersion
//   - PublishReport / PublishSite
//   - SendNotification
//
// The step parameter is a typed struct that determines the operation to
// perform (e.g., CreateBranchStep, SetBuildVersionStep). The implementation
// uses a type switch to dispatch to the appropriate handler.
//
// TODO: Implement individual step handlers as the corresponding OneDev step
// types are ported. For now this is a placeholder that logs the step type
// and returns an unimplemented error.
func RunServerStep(ctx context.Context, step interface{}, jobCtx *JobContext, logger TaskLogger) (*ServerStepResult, error) {
	if step == nil {
		return nil, fmt.Errorf("runServerStep: step is nil")
	}
	if logger != nil {
		logger.Logf("info", "running server step: %T", step)
	}

	// Dispatch to step-specific handlers.
	// Each case will be implemented as the corresponding OneDev step type is ported.
	switch s := step.(type) {
	default:
		return nil, fmt.Errorf("runServerStep: unsupported step type %T", s)
	}
}
