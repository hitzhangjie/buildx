package executor

import (
	"context"
	"fmt"
	"os"
	"os/exec"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// DockerAvailable reports whether the docker CLI is reachable.
func DockerAvailable() bool {
	cmd := exec.Command("docker", "version", "--format", "{{.Server.Version}}")
	if err := cmd.Run(); err != nil {
		return false
	}
	return true
}

// DockerExecutor runs job steps using the local Docker CLI.
type DockerExecutor struct {
	config      ExecutorConfig
	workDirBase string
}

func NewDockerExecutor(workDirBase string) *DockerExecutor {
	enabled := DockerAvailable()
	return &DockerExecutor{
		config: ExecutorConfig{
			Name:    "server-docker",
			Enabled: enabled,
		},
		workDirBase: workDirBase,
	}
}

func (e *DockerExecutor) Name() string { return "server-docker" }

func (e *DockerExecutor) Enabled() bool { return e.config.Enabled }

func (e *DockerExecutor) SupportsHTMLReports() bool  { return true }
func (e *DockerExecutor) SupportsSitePublishing() bool { return true }

func (e *DockerExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	if !e.config.Enabled || jobCtx == nil {
		return false
	}
	if jobCtx.AgentID > 0 {
		return false
	}
	if jobCtx.PreferredExecutor == "server-docker" {
		return true
	}
	if jobCtx.PreferredExecutor != "" && jobCtx.PreferredExecutor != "server-docker" {
		return false
	}
	return jobCtx.RequiresDocker
}

func (e *DockerExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	return e.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

func (e *DockerExecutor) ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error) {
	if !e.config.Enabled {
		return nil, fmt.Errorf("server-docker executor: docker not available")
	}
	workDir := e.buildWorkDir(jobCtx)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, err
	}
	if logger != nil {
		logger.Log("info", "workDir: "+workDir)
	}
	return ExecutePlanOnDocker(ctx, jobCtx, plan, workDir, logger)
}

func (e *DockerExecutor) buildWorkDir(jobCtx *JobContext) string {
	return BuildWorkDir(e.workDirBase, jobCtx)
}

func (e *DockerExecutor) WorkDirFor(jobCtx *JobContext) string {
	return e.buildWorkDir(jobCtx)
}

// PlanNeedsDocker reports whether a compiled plan requires docker-aware execution.
func PlanNeedsDocker(plan *execplan.Plan) bool {
	if plan == nil || plan.Root == nil {
		return false
	}
	return planHasDocker(plan.Root)
}

func planHasDocker(c *execplan.CompositeFacade) bool {
	for _, action := range c.Actions {
		switch f := action.Facade.(type) {
		case *execplan.CompositeFacade:
			if planHasDocker(f) {
				return true
			}
		case *execplan.CommandFacade:
			if f.Image != "" {
				return true
			}
		case *execplan.RunContainerFacade, *execplan.BuildImageFacade, *execplan.PullImageFacade, *execplan.PushImageFacade:
			return true
		}
	}
	return false
}
