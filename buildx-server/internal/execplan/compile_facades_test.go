package execplan_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

func TestCompileJob_SetupCacheAndRunContainer(t *testing.T) {
	job := &buildspec.Job{
		Name: "ci",
		Steps: buildspec.Steps{
			&buildspec.SetupCacheStep{
				StepBase: buildspec.StepBase{Name: "cache"},
				Key:      "npm",
				Paths:    []string{"node_modules"},
			},
			&buildspec.RunContainerStep{
				StepBase: buildspec.StepBase{Name: "container"},
				Image:    "node:20",
				Commands: "npm test",
			},
		},
	}
	plan, err := execplan.CompileJob(execplan.CompileContext{Job: job})
	if err != nil {
		t.Fatal(err)
	}
	if _, ok := plan.Root.Actions[0].Facade.(*execplan.SetupCacheFacade); !ok {
		t.Fatalf("action[0] = %T", plan.Root.Actions[0].Facade)
	}
	if _, ok := plan.Root.Actions[1].Facade.(*execplan.RunContainerFacade); !ok {
		t.Fatalf("action[1] = %T", plan.Root.Actions[1].Facade)
	}
}
