package job_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
)

func TestGetJobContextInvalidToken(t *testing.T) {
	svc := job.NewService(nil, nil, executor.NewRegistry(), nil, nil, nil)
	_, err := svc.GetJobContext("unknown-token", true)
	if err == nil {
		t.Fatal("expected error")
	}
}
