package executor

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// AgentDialer is the interface for communicating with remote build agents.
type AgentDialer interface {
	// ExecuteOnAgent sends a compiled plan to a remote agent for execution.
	ExecuteOnAgent(ctx context.Context, agentID int64, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error)

	// CancelBuild signals a running build on the specified agent to stop.
	CancelBuild(ctx context.Context, agentID, buildID int64) error
}

// RemoteShellExecutor dispatches job commands to remote build agents.
// It maps to OneDev's RemoteShellExecutor and will be wired to the agent
// WebSocket communication channel for agent-based job execution.
type RemoteShellExecutor struct {
	config      ExecutorConfig
	agentDialer AgentDialer
}

// NewRemoteShellExecutor creates a RemoteShellExecutor that delegates command
// execution to the provided AgentDialer. The dialer should be connected to the
// agent WebSocket handler once implemented.
func NewRemoteShellExecutor(agentDialer AgentDialer) *RemoteShellExecutor {
	return &RemoteShellExecutor{
		config: ExecutorConfig{
			Name:    "remote-shell",
			Enabled: true,
		},
		agentDialer: agentDialer,
	}
}

// Name returns the executor name.
func (e *RemoteShellExecutor) Name() string {
	return "remote-shell"
}

// Enabled returns whether this executor is enabled.
func (e *RemoteShellExecutor) Enabled() bool {
	return e.config.Enabled
}

// SupportsHTMLReports returns whether HTML report publishing is enabled.
func (e *RemoteShellExecutor) SupportsHTMLReports() bool {
	return e.config.HTMLReportEnabled
}

// SupportsSitePublishing returns whether static site publishing is enabled.
func (e *RemoteShellExecutor) SupportsSitePublishing() bool {
	return e.config.SitePublishEnabled
}

// IsApplicable returns true when remote execution is requested or an agent is assigned.
func (e *RemoteShellExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	if jobCtx == nil {
		return false
	}
	if jobCtx.AgentID > 0 {
		return true
	}
	return jobCtx.PreferredExecutor == "remote-shell"
}

// Execute sends commands to a remote agent via the AgentDialer.
func (e *RemoteShellExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	return e.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

// ExecutePlan dispatches a compiled plan to a remote agent (command steps only).
func (e *RemoteShellExecutor) ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error) {
	if e.agentDialer == nil {
		return nil, fmt.Errorf("remote-shell executor: no agent dialer configured")
	}
	if jobCtx == nil {
		return nil, fmt.Errorf("remote-shell executor: job context is nil")
	}
	if jobCtx.AgentID == 0 {
		return nil, fmt.Errorf("remote-shell executor: no agent assigned")
	}
	return e.agentDialer.ExecuteOnAgent(ctx, jobCtx.AgentID, jobCtx, plan, logger)
}
