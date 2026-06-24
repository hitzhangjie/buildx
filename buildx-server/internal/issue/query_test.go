package issue

import (
	"testing"
)

func TestParseQuery_projectAndState(t *testing.T) {
	filter := ParseQuery(`"Project" is "demo/foo" and "State" is "Open"`)
	if filter.ProjectPath != "demo/foo" {
		t.Fatalf("project = %q", filter.ProjectPath)
	}
	if filter.State != "Open" {
		t.Fatalf("state = %q", filter.State)
	}
}

func TestParseQuery_number(t *testing.T) {
	filter := ParseQuery(`"Number" is "demo#42"`)
	if filter.NumberProjectPath != "demo" || filter.Number != 42 {
		t.Fatalf("got %+v", filter)
	}
}

func TestParseQuery_titleContains(t *testing.T) {
	filter := ParseQuery(`"Title" contains "bug fix"`)
	if filter.TitleContains != "bug fix" {
		t.Fatalf("title = %q", filter.TitleContains)
	}
}

func TestParseQuery_iteration(t *testing.T) {
	filter := ParseQuery(`"Iteration" is "Sprint 1"`)
	if filter.IterationName != "Sprint 1" {
		t.Fatalf("iteration = %q", filter.IterationName)
	}
	filter = ParseQuery(`"Iteration" is empty`)
	if !filter.UnscheduledOnly {
		t.Fatal("expected unscheduled")
	}
}
