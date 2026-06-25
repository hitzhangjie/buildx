package executor_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

func TestPlanNeedsDocker(t *testing.T) {
	plan := &execplan.Plan{Root: &execplan.CompositeFacade{Actions: []execplan.Action{
		{Name: "cmd", Facade: &execplan.CommandFacade{Image: "golang:1.22"}},
	}}}
	if !executor.PlanNeedsDocker(plan) {
		t.Fatal("expected docker required for image command")
	}
	plain := &execplan.Plan{Root: &execplan.CompositeFacade{Actions: []execplan.Action{
		{Name: "cmd", Facade: &execplan.CommandFacade{Commands: "echo hi"}},
	}}}
	if executor.PlanNeedsDocker(plain) {
		t.Fatal("expected no docker for plain shell")
	}
}

func TestDockerAvailableDoesNotPanic(t *testing.T) {
	_ = executor.DockerAvailable()
}
