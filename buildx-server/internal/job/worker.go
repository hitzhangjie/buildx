package job

import (
	"context"
	"errors"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

var ErrInvalidJobToken = errors.New("invalid or expired job token")

// ActiveJobContext holds runtime state for a running build, keyed by job token.
type ActiveJobContext struct {
	BuildID      int64
	JobCtx       *executor.JobContext
	Plan         *execplan.Plan
	ExecutorName string
	WorkDir      string
}

// GetJobContext resolves a running job by token (worker API authentication).
func (s *Service) GetJobContext(token string, requireRunning bool) (*ActiveJobContext, error) {
	if token == "" {
		return nil, ErrInvalidJobToken
	}
	s.mu.RLock()
	rj, ok := s.runningJobs[token]
	s.mu.RUnlock()
	if !ok || rj == nil {
		return nil, ErrInvalidJobToken
	}
	if requireRunning && rj.Active == nil {
		return nil, ErrInvalidJobToken
	}
	if rj.Active != nil {
		return rj.Active, nil
	}
	return nil, ErrInvalidJobToken
}

// ReportJobWorkDir records the agent-reported work directory for a job.
func (s *Service) ReportJobWorkDir(token, workDir string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if rj, ok := s.runningJobs[token]; ok && rj.Active != nil {
		rj.Active.WorkDir = workDir
		if rj.Active.JobCtx != nil {
			rj.Active.JobCtx.WorkDir = workDir
		}
	}
}

// JobDataForWorker returns ShellJobData for the worker job-data endpoint.
func (s *Service) JobDataForWorker(token string) (*jobdata.ShellJobData, error) {
	active, err := s.GetJobContext(token, true)
	if err != nil {
		return nil, err
	}
	jc := active.JobCtx
	return &jobdata.ShellJobData{
		JobToken:     token,
		ExecutorName: active.ExecutorName,
		ProjectPath:  jc.ProjectPath,
		ProjectID:    jc.ProjectID,
		RefName:      jc.RefName,
		CommitHash:   jc.CommitHash,
		BuildNumber:  jc.BuildNumber,
		BuildID:      jc.BuildID,
		Plan:         active.Plan,
		TimeoutSec:   jc.Timeout,
	}, nil
}

// RunServerStepRequest is the JSON body for worker run-server-step.
type RunServerStepRequest struct {
	StepPosition      []int           `json:"stepPosition"`
	PlaceholderValues map[string]string `json:"placeholderValues"`
}

// RunServerStep executes a server-side step on behalf of a remote agent.
func (s *Service) RunServerStep(ctx context.Context, token string, req RunServerStepRequest, logger executor.TaskLogger) (*executor.ServerStepResult, error) {
	active, err := s.GetJobContext(token, true)
	if err != nil {
		return nil, err
	}
	step, err := stepAtPosition(active.Plan, req.StepPosition)
	if err != nil {
		return nil, err
	}
	facade, ok := step.Facade.(*execplan.ServerSideFacade)
	if !ok {
		return nil, fmt.Errorf("step at position %v is not a server-side step", req.StepPosition)
	}
	workDir := active.WorkDir
	if workDir == "" && active.JobCtx != nil {
		workDir = active.JobCtx.WorkDir
	}
	return executor.RunServerStep(ctx, facade.Step, active.JobCtx, workDir, logger)
}

func stepAtPosition(plan *execplan.Plan, position []int) (*execplan.Action, error) {
	if plan == nil || plan.Root == nil {
		return nil, fmt.Errorf("plan is empty")
	}
	if len(position) == 0 {
		return nil, fmt.Errorf("step position is required")
	}
	composite := plan.Root
	var action execplan.Action
	for i, idx := range position {
		if idx < 0 || idx >= len(composite.Actions) {
			return nil, fmt.Errorf("invalid step position index %d at depth %d", idx, i)
		}
		action = composite.Actions[idx]
		if i < len(position)-1 {
			next, ok := action.Facade.(*execplan.CompositeFacade)
			if !ok {
				return nil, fmt.Errorf("step position %v is not composite at depth %d", position, i)
			}
			composite = next
		}
	}
	return &action, nil
}

// CopyDependencies copies dependency artifacts into destDir for worker download.
func (s *Service) CopyDependencies(ctx context.Context, token, destDir string) error {
	active, err := s.GetJobContext(token, true)
	if err != nil {
		return err
	}
	s.copyDependencyArtifacts(ctx, active.BuildID, destDir)
	return nil
}

// SetActiveJobContext stores plan and context for worker API during execution.
func (s *Service) setActiveJobContext(token string, active *ActiveJobContext) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if rj, ok := s.runningJobs[token]; ok {
		rj.Active = active
	}
}

// resolveStepFromBuild is a helper for tests — finds step type in compiled plan.
func resolveStepFromBuild(plan *execplan.Plan, stepType buildspec.StepType) buildspec.Step {
	if plan == nil || plan.Root == nil {
		return nil
	}
	for _, action := range plan.Root.Actions {
		if sf, ok := action.Facade.(*execplan.ServerSideFacade); ok && sf.Step != nil {
			if sf.Step.StepType() == stepType {
				return sf.Step
			}
		}
	}
	return nil
}
