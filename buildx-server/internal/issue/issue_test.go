package issue_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
)

func TestIssueStateConstants(t *testing.T) {
	if issue.StateOpen != "Open" {
		t.Fatalf("StateOpen = %q", issue.StateOpen)
	}
	if issue.DefaultState != issue.StateOpen {
		t.Fatalf("DefaultState = %q", issue.DefaultState)
	}
}

func TestStateOrdinal(t *testing.T) {
	if issue.StateOrdinal(issue.StateOpen) >= issue.StateOrdinal(issue.StateClosed) {
		t.Fatal("Open should sort before Closed")
	}
}
