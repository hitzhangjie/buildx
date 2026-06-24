package agent_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent"
)

func TestContextStruct(t *testing.T) {
	issueID := int64(42)
	c := agent.Context{
		ProjectID: 1,
		IssueID:   &issueID,
	}
	if c.ProjectID != 1 {
		t.Errorf("ProjectID = %d", c.ProjectID)
	}
	if *c.IssueID != 42 {
		t.Errorf("IssueID = %d", *c.IssueID)
	}
}
