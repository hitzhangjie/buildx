package execplan_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

func TestCompileImageSteps(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{{
			Name: "docker-job",
			Steps: buildspec.Steps{
				&buildspec.BuildImageStep{StepBase: buildspec.StepBase{Name: "build"}, Tags: []string{"app:latest"}},
				&buildspec.PullImageStep{StepBase: buildspec.StepBase{Name: "pull"}, ImageTags: []string{"alpine:latest"}},
				&buildspec.PushImageStep{StepBase: buildspec.StepBase{Name: "push"}, ImageTags: []string{"app:latest"}},
			},
		}},
	}
	job := spec.Jobs[0]
	plan, err := execplan.CompileJob(execplan.CompileContext{Spec: spec, Job: job})
	if err != nil {
		t.Fatal(err)
	}
	if plan == nil || plan.Root == nil || len(plan.Root.Actions) != 3 {
		t.Fatalf("expected 3 actions, got %v", plan)
	}
}
