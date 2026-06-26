package executor

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// RemoteDockerExecutor runs docker-aware jobs on remote agents (skeleton).
type RemoteDockerExecutor struct {
	config      ExecutorConfig
	agentDialer AgentDialer
}

// NewRemoteDockerExecutor creates a remote docker executor stub.
func NewRemoteDockerExecutor(agentDialer AgentDialer) *RemoteDockerExecutor {
	return &RemoteDockerExecutor{
		config: ExecutorConfig{
			Name:    "remote-docker",
			Enabled: agentDialer != nil,
		},
		agentDialer: agentDialer,
	}
}

func (e *RemoteDockerExecutor) Name() string { return "remote-docker" }

func (e *RemoteDockerExecutor) Enabled() bool { return e.config.Enabled && e.agentDialer != nil }

func (e *RemoteDockerExecutor) SupportsHTMLReports() bool  { return true }
func (e *RemoteDockerExecutor) SupportsSitePublishing() bool { return true }

func (e *RemoteDockerExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	if !e.Enabled() || jobCtx == nil {
		return false
	}
	if jobCtx.PreferredExecutor == "remote-docker" {
		return jobCtx.AgentID > 0
	}
	return false
}

func (e *RemoteDockerExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	return e.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

func (e *RemoteDockerExecutor) ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error) {
	if e.agentDialer == nil {
		return nil, fmt.Errorf("remote-docker executor: no agent dialer")
	}
	if jobCtx == nil || jobCtx.AgentID == 0 {
		return nil, fmt.Errorf("remote-docker executor: no agent assigned")
	}
	if logger != nil {
		logger.Log("info", "dispatching docker plan to remote agent")
	}
	return e.agentDialer.ExecuteOnAgent(ctx, jobCtx.AgentID, jobCtx, plan, logger)
}
