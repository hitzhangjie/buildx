package executor_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// ---------------------------------------------------------------------------
// RunServerStep tests
// ---------------------------------------------------------------------------

func TestRunServerStep_NilStep(t *testing.T) {
	_, err := executor.RunServerStep(context.Background(), nil, &executor.JobContext{}, nil)
	if err == nil {
		t.Fatal("expected error for nil step")
	}
}

func TestRunServerStep_UnsupportedStep(t *testing.T) {
	_, err := executor.RunServerStep(context.Background(), "string-step", &executor.JobContext{}, nil)
	if err == nil {
		t.Fatal("expected error for unsupported step type")
	}
}

func TestRunServerStep_WithLogger(t *testing.T) {
	log := executor.NewBuildLogger(1)
	_, err := executor.RunServerStep(context.Background(), "some-step", &executor.JobContext{BuildID: 1}, log)
	if err == nil {
		t.Fatal("expected error for unsupported step type")
	}

	entries := log.Entries()
	if len(entries) == 0 {
		t.Fatal("expected at least one log entry")
	}
}

func TestRunServerStep_NilJobCtx(t *testing.T) {
	_, err := executor.RunServerStep(context.Background(), "step", nil, nil)
	if err == nil {
		t.Fatal("expected error")
	}
}

// ServerStepResult basic usage.
func TestServerStepResult_Basic(t *testing.T) {
	r := executor.ServerStepResult{
		Success: true,
		Message: "done",
		Outputs: map[string]string{"version": "1.0"},
	}
	if !r.Success || r.Message != "done" || r.Outputs["version"] != "1.0" {
		t.Fatal("basic field access")
	}
}
