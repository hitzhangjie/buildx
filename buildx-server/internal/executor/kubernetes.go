package executor

import (
	"context"
	"fmt"
	"os"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// KubernetesExecutor runs jobs in Kubernetes pods (stub — disabled without kubeconfig).
type KubernetesExecutor struct {
	config      ExecutorConfig
	workDirBase string
	kubeconfig  string
}

// NewKubernetesExecutor creates a k8s executor. Enabled only when KUBECONFIG or
// ~/.kube/config exists.
func NewKubernetesExecutor(workDirBase string) *KubernetesExecutor {
	kc := os.Getenv("KUBECONFIG")
	if kc == "" {
		home, _ := os.UserHomeDir()
		if home != "" {
			candidate := home + "/.kube/config"
			if _, err := os.Stat(candidate); err == nil {
				kc = candidate
			}
		}
	}
	return &KubernetesExecutor{
		config: ExecutorConfig{
			Name:    "kubernetes",
			Enabled: kc != "",
		},
		workDirBase: workDirBase,
		kubeconfig:  kc,
	}
}

func (e *KubernetesExecutor) Name() string { return "kubernetes" }

func (e *KubernetesExecutor) Enabled() bool { return e.config.Enabled }

func (e *KubernetesExecutor) SupportsHTMLReports() bool  { return true }
func (e *KubernetesExecutor) SupportsSitePublishing() bool { return true }

func (e *KubernetesExecutor) IsApplicable(ctx context.Context, jobCtx *JobContext) bool {
	if !e.config.Enabled || jobCtx == nil {
		return false
	}
	if jobCtx.AgentID > 0 {
		return false
	}
	return jobCtx.PreferredExecutor == "kubernetes" || (jobCtx.PreferredExecutor == "" && jobCtx.RequiresDocker)
}

func (e *KubernetesExecutor) Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error) {
	return e.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

func (e *KubernetesExecutor) ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error) {
	if !e.config.Enabled {
		return nil, fmt.Errorf("kubernetes executor: no kubeconfig configured")
	}
	// Stub: delegate to docker executor path until k8s helper is ported.
	if logger != nil {
		logger.Log("warning", "kubernetes executor stub: falling back to docker plan execution")
	}
	workDir := e.buildWorkDir(jobCtx)
	if err := os.MkdirAll(workDir, 0755); err != nil {
		return nil, err
	}
	if de := NewDockerExecutor(e.workDirBase); de.Enabled() {
		return ExecutePlanOnDocker(ctx, jobCtx, plan, workDir, logger)
	}
	return nil, fmt.Errorf("kubernetes executor: docker fallback unavailable")
}

func (e *KubernetesExecutor) buildWorkDir(jobCtx *JobContext) string {
	return BuildWorkDir(e.workDirBase, jobCtx)
}
