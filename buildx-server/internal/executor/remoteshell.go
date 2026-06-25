package executor

import (
	"context"
	"fmt"
)

// AgentDialer is the interface for communicating with remote build agents.
// Implementations will connect to agents via WebSocket, handling command
// dispatch, log streaming, and cancellation.
type AgentDialer interface {
	// ExecuteOnAgent sends commands to a remote agent for execution.
	// The implementation manages the WebSocket connection, streams logs
	// back through the TaskLogger, and returns step results.
	ExecuteOnAgent(ctx context.Context, agentID int64, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error)

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

// IsApplicable returns true when the job context has a valid remote agent
// assigned (AgentID > 0). This ensures remote-shell executors are only used
// for jobs explicitly routed to agents.
func (e *RemoteShellExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	return jobCtx != nil && jobCtx.AgentID > 0
}

// Execute sends commands to a remote agent via the AgentDialer.
// Returns an error if no AgentDialer is configured.
func (e *RemoteShellExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	if e.agentDialer == nil {
		return nil, fmt.Errorf("remote-shell executor: no agent dialer configured")
	}
	if jobCtx == nil {
		return nil, fmt.Errorf("remote-shell executor: job context is nil")
	}
	if jobCtx.AgentID == 0 {
		return nil, fmt.Errorf("remote-shell executor: no agent assigned")
	}
	return e.agentDialer.ExecuteOnAgent(ctx, jobCtx.AgentID, jobCtx, commands, logger)
}
