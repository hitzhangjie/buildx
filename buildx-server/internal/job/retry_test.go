package job_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func TestMatchesRetryCondition(t *testing.T) {
	j := &buildspec.Job{RetryCondition: "always", MaxRetries: 3}
	if !job.MatchesRetryCondition(j, job.RetryContext{Build: &model.Build{}}) {
		t.Fatal("expected always to match")
	}
	j.RetryCondition = "never"
	if job.MatchesRetryCondition(j, job.RetryContext{}) {
		t.Fatal("never should not match")
	}
	j.RetryCondition = `log contains "timeout"`
	if !job.MatchesRetryCondition(j, job.RetryContext{ErrorMessage: "step timeout exceeded"}) {
		t.Fatal("expected log contains match")
	}
}

func TestEvaluateTriggers_BranchUpdateJobPackage(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{{
			Name: "ci",
			Triggers: buildspec.Triggers{
				&buildspec.BranchUpdateTrigger{TriggerBase: buildspec.TriggerBase{}, Branches: "main"},
			},
		}},
	}
	matches := job.EvaluateTriggers(spec, &job.MatchContext{
		EventType: "push",
		RefName:   "refs/heads/main",
	})
	if len(matches) != 1 || matches[0].JobName != "ci" {
		t.Fatalf("matches = %+v", matches)
	}
}
