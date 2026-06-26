package execplan

import (
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// CompileContext holds inputs for step → Action compilation.
type CompileContext struct {
	Spec     *buildspec.BuildSpec
	Job      *buildspec.Job
	ParamMap map[string]string
}

// CompileJob compiles a job's steps into an executable Action plan.
func CompileJob(ctx CompileContext) (*Plan, error) {
	if ctx.Job == nil {
		return nil, fmt.Errorf("execplan: job is nil")
	}
	secrets := LoadSecretsFromEnv()
	actions, err := compileSteps(ctx, ctx.Job.Steps, secrets)
	if err != nil {
		return nil, err
	}
	serviceActions, err := compileRequiredServices(ctx, secrets)
	if err != nil {
		return nil, err
	}
	actions = append(serviceActions, actions...)
	return &Plan{Root: &CompositeFacade{Actions: actions}}, nil
}

func compileRequiredServices(ctx CompileContext, secrets map[string]string) ([]Action, error) {
	if ctx.Spec == nil || ctx.Job == nil || len(ctx.Job.RequiredServices) == 0 {
		return nil, nil
	}
	serviceMap := ctx.Spec.GetServiceMap()
	var actions []Action
	for _, name := range ctx.Job.RequiredServices {
		svc := serviceMap[name]
		if svc == nil {
			return nil, fmt.Errorf("execplan: required service %q not found", name)
		}
		env := mapsClone(svc.EnvVars)
		mergeParamsIntoEnv(env, ctx.ParamMap)
		for k, v := range env {
			env[k] = InterpolateString(v, ctx.ParamMap, secrets)
		}
		actions = append(actions, Action{
			Name: "service:" + svc.Name,
			Facade: &ServiceFacade{
				Name:         svc.Name,
				Image:        InterpolateString(svc.Image, ctx.ParamMap, secrets),
				Command:      InterpolateString(svc.Command, ctx.ParamMap, secrets),
				EnvVars:      env,
				Ports:        svc.Ports,
				ReadyCommand: InterpolateString(svc.ReadyCommand, ctx.ParamMap, secrets),
			},
		})
	}
	return actions, nil
}

func compileSteps(ctx CompileContext, steps buildspec.Steps, secrets map[string]string) ([]Action, error) {
	var actions []Action
	for _, step := range steps {
		if step == nil {
			continue
		}
		compiled, err := compileStep(ctx, step, secrets)
		if err != nil {
			return nil, err
		}
		actions = append(actions, compiled...)
	}
	return actions, nil
}

func compileStep(ctx CompileContext, step buildspec.Step, secrets map[string]string) ([]Action, error) {
	switch s := step.(type) {
	case *buildspec.UseTemplateStep:
		return compileUseTemplate(ctx, s, secrets)
	default:
		action, err := leafAction(ctx, step, secrets)
		if err != nil {
			return nil, err
		}
		if action == nil {
			return nil, nil
		}
		return []Action{*action}, nil
	}
}

func compileUseTemplate(ctx CompileContext, uts *buildspec.UseTemplateStep, secrets map[string]string) ([]Action, error) {
	if ctx.Spec == nil {
		return nil, fmt.Errorf("execplan: build spec required to expand template %q", uts.TemplateName)
	}
	template := ctx.Spec.GetStepTemplateMap()[uts.TemplateName]
	if template == nil {
		return nil, fmt.Errorf("execplan: step template %q not found", uts.TemplateName)
	}

	paramMaps := ResolveParamMaps(uts.ParamMatrix, uts.ExcludeParamMaps, ctx.ParamMap)
	if len(paramMaps) == 0 {
		paramMaps = []map[string]string{mapsClone(ctx.ParamMap)}
	}

	var actions []Action
	for i, paramMap := range paramMaps {
		childCtx := ctx
		childCtx.ParamMap = paramMap
		childSteps, err := compileSteps(childCtx, template.Steps, secrets)
		if err != nil {
			return nil, fmt.Errorf("template %q: %w", uts.TemplateName, err)
		}
		repeat := i + 1
		for j := range childSteps {
			if repeat > 1 && childSteps[j].Name != "" {
				childSteps[j].Name = fmt.Sprintf("%s (%d)", childSteps[j].Name, repeat)
			}
		}
		actions = append(actions, childSteps...)
	}
	return actions, nil
}

func leafAction(ctx CompileContext, step buildspec.Step, secrets map[string]string) (*Action, error) {
	name := step.GetName()
	if name == "" {
		name = string(step.StepType())
	}

	switch s := step.(type) {
	case *buildspec.CommandStep:
		env := mapsClone(s.EnvVars)
		mergeParamsIntoEnv(env, ctx.ParamMap)
		for k, v := range env {
			env[k] = InterpolateString(v, ctx.ParamMap, secrets)
		}
		return &Action{
			Name: name,
			Facade: &CommandFacade{
				Name:        name,
				Commands:    InterpolateString(s.Commands, ctx.ParamMap, secrets),
				Image:       InterpolateString(s.Image, ctx.ParamMap, secrets),
				Interpreter: s.Interpreter,
				EnvVars:     env,
				UseTTY:      s.UseTTY,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.CheckoutStep:
		return &Action{
			Name: name,
			Facade: &CheckoutFacade{
				Name:           name,
				WithLFS:        s.WithLFS,
				WithSubmodules: s.WithSubmodules,
				CloneDepth:     s.CloneDepth,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.SetupCacheStep:
		return &Action{
			Name: name,
			Facade: &SetupCacheFacade{
				Name:           name,
				Key:            s.Key,
				ChecksumFiles:  s.ChecksumFiles,
				Paths:          s.Paths,
				UploadStrategy: s.UploadStrategy,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.RunContainerStep:
		env := mapsClone(s.EnvVars)
		mergeParamsIntoEnv(env, ctx.ParamMap)
		return &Action{
			Name: name,
			Facade: &RunContainerFacade{
				Name:     name,
				Image:    s.Image,
				Commands: s.Commands,
				EnvVars:  env,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.BuildImageStep:
		return &Action{
			Name: name,
			Facade: &BuildImageFacade{
				Name:        name,
				Dockerfile:  s.Dockerfile,
				ContextPath: s.ContextPath,
				Tags:        s.Tags,
				BuildArgs:   mapsClone(s.BuildArgs),
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.PullImageStep:
		return &Action{
			Name: name,
			Facade: &PullImageFacade{
				Name:      name,
				ImageTags: s.ImageTags,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.PushImageStep:
		return &Action{
			Name: name,
			Facade: &PushImageFacade{
				Name:      name,
				ImageTags: s.ImageTags,
			},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.SetBuildVersionStep,
		*buildspec.SetBuildDescriptionStep,
		*buildspec.CreateBranchStep,
		*buildspec.CreateTagStep,
		*buildspec.CreatePullRequestStep,
		*buildspec.PublishArtifactStep,
		*buildspec.PublishReportStep:
		return &Action{
			Name:      name,
			Facade:    &ServerSideFacade{Name: name, Step: step},
			Condition: ParseExecuteCondition(step.GetCondition()),
		}, nil
	case *buildspec.UseTemplateStep:
		return nil, fmt.Errorf("execplan: UseTemplateStep must be handled by compileUseTemplate")
	default:
		return nil, fmt.Errorf("execplan: unsupported step type %q", step.StepType())
	}
}

func mergeParamsIntoEnv(env map[string]string, params map[string]string) {
	if env == nil {
		return
	}
	for k, v := range params {
		key := "BUILDX_PARAM_" + k
		if _, exists := env[key]; !exists {
			env[key] = v
		}
	}
}

func mapsClone(m map[string]string) map[string]string {
	if len(m) == 0 {
		return map[string]string{}
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
