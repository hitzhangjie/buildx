package executor_test

import (
	"context"
	"errors"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// ---------------------------------------------------------------------------
// RemoteShellExecutor tests
// ---------------------------------------------------------------------------

func TestRemoteShell_Name(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	if e.Name() != "remote-shell" {
		t.Fatalf("expected name 'remote-shell', got %q", e.Name())
	}
}

func TestRemoteShell_IsApplicable_WithAgent(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	jc := &executor.JobContext{AgentID: 1}
	if !e.IsApplicable(context.Background(), jc) {
		t.Fatal("expected applicable when AgentID > 0")
	}
}

func TestRemoteShell_IsApplicable_WithoutAgent(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	jc := &executor.JobContext{AgentID: 0}
	if e.IsApplicable(context.Background(), jc) {
		t.Fatal("expected not applicable when AgentID == 0 and no preferred executor")
	}
	jc.PreferredExecutor = "remote-shell"
	if !e.IsApplicable(context.Background(), jc) {
		t.Fatal("expected applicable when preferred executor is remote-shell")
	}
}

func TestRemoteShell_IsApplicable_NilContext(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	if e.IsApplicable(context.Background(), nil) {
		t.Fatal("expected not applicable for nil job context")
	}
}

func TestRemoteShell_Execute_NoDialer(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	_, err := e.Execute(context.Background(), &executor.JobContext{AgentID: 1}, []string{"echo"}, nil)
	if err == nil {
		t.Fatal("expected error when no agent dialer configured")
	}
}

func TestRemoteShell_Execute_NilJobCtx(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	_, err := e.Execute(context.Background(), nil, []string{"echo"}, nil)
	if err == nil {
		t.Fatal("expected error for nil job context")
	}
}

func TestRemoteShell_Execute_NoAgentAssigned(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	_, err := e.Execute(context.Background(), &executor.JobContext{}, []string{"echo"}, nil)
	if err == nil {
		t.Fatal("expected error when AgentID == 0")
	}
}

func TestRemoteShell_Execute_DelegatesToDialer(t *testing.T) {
	dialer := &mockAgentDialer{expectedResult: []executor.StepResult{{Name: "step-1", Success: true}}}
	e := executor.NewRemoteShellExecutor(dialer)

	ctx := context.Background()
	jc := &executor.JobContext{
		AgentID:     1,
		BuildID:     42,
		BuildNumber: 1,
		ProjectID:   10,
	}

	results, err := e.Execute(ctx, jc, []string{"echo hello"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if !results[0].Success {
		t.Fatal("expected success")
	}
}

func TestRemoteShell_EnabledByDefault(t *testing.T) {
	e := executor.NewRemoteShellExecutor(nil)
	if !e.Enabled() {
		t.Fatal("expected enabled by default")
	}
}

// ---------------------------------------------------------------------------
// mockAgentDialer
// ---------------------------------------------------------------------------

type mockAgentDialer struct {
	expectedResult []executor.StepResult
	expectedError  error
}

func (m *mockAgentDialer) ExecuteOnAgent(ctx context.Context, agentID int64, jobCtx *executor.JobContext, plan *execplan.Plan, logger executor.TaskLogger) ([]executor.StepResult, error) {
	if m.expectedError != nil {
		return nil, m.expectedError
	}
	return m.expectedResult, nil
}

func (m *mockAgentDialer) CancelBuild(ctx context.Context, agentID, buildID int64) error {
	return errors.New("not implemented")
}
