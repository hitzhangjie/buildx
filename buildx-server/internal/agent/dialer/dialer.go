// Package dialer dispatches compiled job plans to remote build agents.
package dialer

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/protocol"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/runtime"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// WebSocketDialer implements executor.AgentDialer using the agent runtime service.
type WebSocketDialer struct {
	runtime *runtime.Service
}

// NewWebSocketDialer creates a dialer backed by agent runtime WebSocket sessions.
func NewWebSocketDialer(svc *runtime.Service) *WebSocketDialer {
	return &WebSocketDialer{runtime: svc}
}

// ExecuteOnAgent sends a full ShellJobData plan to the agent and waits for completion.
func (d *WebSocketDialer) ExecuteOnAgent(
	ctx context.Context,
	agentID int64,
	jobCtx *executor.JobContext,
	plan *execplan.Plan,
	logger executor.TaskLogger,
) ([]executor.StepResult, error) {
	if d == nil || d.runtime == nil {
		return nil, fmt.Errorf("agent dialer: runtime not configured")
	}
	if jobCtx == nil {
		return nil, fmt.Errorf("agent dialer: job context is nil")
	}
	if plan == nil {
		return nil, fmt.Errorf("agent dialer: plan is nil")
	}

	data := jobdata.ShellJobData{
		JobToken:     jobCtx.JobToken,
		ExecutorName: "remote-shell",
		ProjectPath:  jobCtx.ProjectPath,
		ProjectID:    jobCtx.ProjectID,
		RefName:      jobCtx.RefName,
		CommitHash:   jobCtx.CommitHash,
		BuildNumber:  jobCtx.BuildNumber,
		BuildID:      jobCtx.BuildID,
		Plan:         plan,
		TimeoutSec:   jobCtx.Timeout,
	}

	waitCh := protocol.RegisterPending(jobCtx.JobToken)
	defer protocol.CancelPending(jobCtx.JobToken)

	msg := map[string]any{
		"type":    "executePlan",
		"jobData": data,
	}
	if err := d.runtime.SendMessage(agentID, msg); err != nil {
		return nil, fmt.Errorf("agent dialer: send plan: %w", err)
	}
	if logger != nil {
		logger.Log("info", fmt.Sprintf("dispatched plan to agent %d", agentID))
	}

	timeout := time.Duration(jobCtx.Timeout) * time.Second
	if timeout <= 0 {
		timeout = 24 * time.Hour
	}
	timer := time.NewTimer(timeout)
	defer timer.Stop()

	select {
	case <-ctx.Done():
		_ = d.runtime.SendMessage(agentID, map[string]any{
			"type":     "cancel",
			"buildId":  jobCtx.BuildID,
			"jobToken": jobCtx.JobToken,
		})
		return nil, ctx.Err()
	case <-timer.C:
		_ = d.runtime.SendMessage(agentID, map[string]any{
			"type":     "cancel",
			"buildId":  jobCtx.BuildID,
			"jobToken": jobCtx.JobToken,
		})
		return nil, context.DeadlineExceeded
	case result := <-waitCh:
		return stepResultsFromJob(result), jobError(result)
	}
}

func stepResultsFromJob(r jobdata.JobResult) []executor.StepResult {
	out := make([]executor.StepResult, 0, len(r.Steps))
	for _, s := range r.Steps {
		out = append(out, executor.StepResult{
			Name:       s.Name,
			Success:    s.Success,
			ExitCode:   s.ExitCode,
			DurationMs: s.DurationMs,
			Error:      s.Error,
		})
	}
	return out
}

func jobError(r jobdata.JobResult) error {
	if r.Success {
		return nil
	}
	if r.Error != "" {
		return fmt.Errorf("%s", r.Error)
	}
	return fmt.Errorf("agent job failed")
}

// CancelBuild sends a cancel message to the agent.
func (d *WebSocketDialer) CancelBuild(_ context.Context, agentID, buildID int64) error {
	if d == nil || d.runtime == nil {
		return fmt.Errorf("agent dialer: not configured")
	}
	return d.runtime.SendMessage(agentID, map[string]any{
		"type":    "cancel",
		"buildId": buildID,
	})
}

// ParseJobResult parses an agent completion message.
func ParseJobResult(raw json.RawMessage) (jobdata.JobResult, error) {
	var result jobdata.JobResult
	if err := json.Unmarshal(raw, &result); err != nil {
		return result, err
	}
	return result, nil
}
