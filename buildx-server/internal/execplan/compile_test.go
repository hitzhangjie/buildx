package execplan_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

func TestCompileJob_CommandSteps(t *testing.T) {
	job := &buildspec.Job{
		Name: "ci",
		Steps: buildspec.Steps{
			&buildspec.CommandStep{
				StepBase: buildspec.StepBase{Name: "build"},
				Commands: "echo build",
			},
			&buildspec.CommandStep{
				StepBase: buildspec.StepBase{Name: "test"},
				Commands: "echo test",
			},
		},
	}

	plan, err := execplan.CompileJob(execplan.CompileContext{Job: job})
	if err != nil {
		t.Fatalf("CompileJob: %v", err)
	}
	if plan.Root == nil || len(plan.Root.Actions) != 2 {
		t.Fatalf("expected 2 actions, got %v", plan.Root)
	}
	cmd, ok := plan.Root.Actions[0].Facade.(*execplan.CommandFacade)
	if !ok || cmd.Commands != "echo build" {
		t.Fatalf("first action: %T commands=%q", plan.Root.Actions[0].Facade, cmd.Commands)
	}
}

func TestCompileJob_UseTemplateParamMatrix(t *testing.T) {
	spec := &buildspec.BuildSpec{
		StepTemplates: []*buildspec.StepTemplate{
			{
				Name: "scan",
				Steps: buildspec.Steps{
					&buildspec.CommandStep{
						StepBase: buildspec.StepBase{Name: "run-scan"},
						Commands: "echo scan @param:target@",
					},
				},
				ParamSpecs: buildspec.ParamSpecs{
					&buildspec.TextParam{ParamSpecBase: buildspec.ParamSpecBase{Name: "target"}},
				},
			},
		},
		Jobs: []*buildspec.Job{
			{
				Name: "ci",
				Steps: buildspec.Steps{
					&buildspec.UseTemplateStep{
						StepBase:     buildspec.StepBase{Name: "use-scan"},
						TemplateName: "scan",
						ParamMatrix: []buildspec.ParamInstances{
							{Name: "target", Values: []string{"linux", "windows"}},
						},
					},
				},
			},
		},
	}

	plan, err := execplan.CompileJob(execplan.CompileContext{
		Spec: spec,
		Job:  spec.Jobs[0],
	})
	if err != nil {
		t.Fatalf("CompileJob: %v", err)
	}
	if len(plan.Root.Actions) != 2 {
		t.Fatalf("expected 2 expanded template actions, got %d", len(plan.Root.Actions))
	}
	if plan.Root.Actions[1].Name != "run-scan (2)" {
		t.Fatalf("second repeat name = %q", plan.Root.Actions[1].Name)
	}
}

func TestResolveParamMaps_Exclude(t *testing.T) {
	maps := execplan.ResolveParamMaps(
		[]buildspec.ParamInstances{{Name: "os", Values: []string{"linux", "windows"}}},
		[]buildspec.ParamMap{{Params: map[string]string{"os": "windows"}}},
		nil,
	)
	if len(maps) != 1 || maps[0]["os"] != "linux" {
		t.Fatalf("unexpected maps: %v", maps)
	}
}

func TestPlanRun_StopsOnFailure(t *testing.T) {
	plan := &execplan.Plan{
		Root: &execplan.CompositeFacade{
			Actions: []execplan.Action{
				{
					Name:      "fail",
					Facade:    &execplan.CommandFacade{Commands: "exit 1"},
					Condition: execplan.ExecuteConditionAlways,
				},
				{
					Name:      "never",
					Facade:    &execplan.CommandFacade{Commands: "echo never"},
					Condition: execplan.ExecuteConditionAlways,
				},
			},
		},
	}

	results, err := plan.Run(context.Background(), func(_ context.Context, action execplan.Action, _ execplan.LeafFacade, _ []int) (execplan.LeafResult, error) {
		if action.Name == "fail" {
			return execplan.LeafResult{StepResultName: action.Name, Success: false}, nil
		}
		return execplan.LeafResult{StepResultName: action.Name, Success: true}, nil
	})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result before stop, got %d", len(results))
	}
}
