package executor_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

func TestRunServerStep_NilStep(t *testing.T) {
	_, err := executor.RunServerStep(context.Background(), nil, &executor.JobContext{}, "", nil)
	if err == nil {
		t.Fatal("expected error for nil step")
	}
}

func TestRunServerStep_UnsupportedStep(t *testing.T) {
	_, err := executor.RunServerStep(context.Background(), "string-step", &executor.JobContext{}, "", nil)
	if err == nil {
		t.Fatal("expected error for unsupported step type")
	}
}

func TestRunServerStep_WithLogger(t *testing.T) {
	log := executor.NewBuildLogger(1)
	_, err := executor.RunServerStep(context.Background(), "some-step", &executor.JobContext{BuildID: 1}, "", log)
	if err == nil {
		t.Fatal("expected error for unsupported step type")
	}

	entries := log.Entries()
	if len(entries) == 0 {
		t.Fatal("expected at least one log entry")
	}
}

func TestRunServerStep_SetBuildVersion(t *testing.T) {
	store := &versionStore{}
	handler := &executor.DefaultServerStepHandler{BuildStore: store}
	jc := &executor.JobContext{
		BuildID:     1,
		ServerSteps: handler,
	}
	step := &buildspec.SetBuildVersionStep{StepBase: buildspec.StepBase{Name: "ver"}, Version: "1.2.3"}
	res, err := executor.RunServerStep(context.Background(), step, jc, "", nil)
	if err != nil {
		t.Fatal(err)
	}
	if !res.Success || store.version != "1.2.3" {
		t.Fatalf("res=%+v version=%q", res, store.version)
	}
}

type versionStore struct {
	version string
}

func (v *versionStore) UpdateVersion(_ context.Context, _ int64, version string) error {
	v.version = version
	return nil
}

func (v *versionStore) UpdateDescription(_ context.Context, _ int64, _ string) error {
	return nil
}

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
