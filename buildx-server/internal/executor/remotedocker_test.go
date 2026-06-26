package executor_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

func TestKubernetesExecutorDisabledWithoutKubeconfig(t *testing.T) {
	t.Setenv("KUBECONFIG", "")
	e := executor.NewKubernetesExecutor("/tmp/builds")
	if e.Enabled() {
		t.Skip("kubeconfig present in environment")
	}
	if e.IsApplicable(context.Background(), &executor.JobContext{PreferredExecutor: "kubernetes"}) {
		t.Fatal("expected not applicable without kubeconfig")
	}
}

func TestRemoteDockerExecutorRequiresAgent(t *testing.T) {
	e := executor.NewRemoteDockerExecutor(nil)
	if e.Enabled() {
		t.Fatal("expected disabled without dialer")
	}
}
