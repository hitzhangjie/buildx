// Package issue defines issue tracking, kanban boards, sprints, and workflows.
//
// Maps to OneDev: io.onedev.server.service.IssueService, IssueScheduleService
package issue

// OneDev default workflow state names.
const (
	StateOpen       = "Open"
	StateInProgress = "In Progress"
	StateInReview   = "In Review"
	StateClosed     = "Closed"
)

// DefaultState is assigned to newly created issues.
const DefaultState = StateOpen

// StateOrdinal returns the sort order for a workflow state name.
func StateOrdinal(state string) int {
	switch state {
	case StateOpen:
		return 0
	case StateInProgress:
		return 1
	case StateInReview:
		return 2
	case StateClosed:
		return 3
	default:
		return 99
	}
}
