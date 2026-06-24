package issue_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
)

func TestIssueStateConstants(t *testing.T) {
	tests := []struct {
		name string
		got  issue.State
		want issue.State
	}{
		{"Open", issue.StateOpen, "open"},
		{"InProgress", issue.StateInProgress, "in_progress"},
		{"Closed", issue.StateClosed, "closed"},
	}
	for _, tc := range tests {
		if tc.got != tc.want {
			t.Errorf("%s = %q, want %q", tc.name, tc.got, tc.want)
		}
	}
}

func TestIssueStruct(t *testing.T) {
	assignee := int64(5)
	i := issue.Issue{
		ID:        1,
		ProjectID: 2,
		Number:    42,
		Title:     "Fix bug",
		State:     issue.StateOpen,
		Assignee:  &assignee,
	}
	if i.State != issue.StateOpen {
		t.Error("State should be open")
	}
	if *i.Assignee != 5 {
		t.Errorf("Assignee = %d", *i.Assignee)
	}
}
