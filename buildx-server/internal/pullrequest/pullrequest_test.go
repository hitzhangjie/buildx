package pullrequest_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
)

func TestPullRequest(t *testing.T) {
	pr := pullrequest.PullRequest{
		ID:           1,
		ProjectID:    2,
		Number:       1,
		Title:        "test PR",
		SourceBranch: "feature/x",
		TargetBranch: "main",
		Status:       "OPEN",
	}
	if pr.ID != 1 {
		t.Errorf("ID = %d", pr.ID)
	}
	if pr.Title != "test PR" {
		t.Errorf("Title = %q", pr.Title)
	}
}
