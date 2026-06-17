// Package issue defines issue tracking, kanban boards, sprints, and workflows.
//
// Maps to OneDev: io.onedev.server.service.IssueService, IssueScheduleService
package issue

import "context"

// State represents an issue workflow state.
type State string

const (
	StateOpen       State = "open"
	StateInProgress State = "in_progress"
	StateClosed     State = "closed"
)

// Issue is a work item linked to code, builds, and pull requests.
type Issue struct {
	ID        int64
	ProjectID int64
	Number    int
	Title     string
	State     State
	Assignee  *int64
}

// Service manages issues and their cross-entity links.
type Service interface {
	Get(ctx context.Context, projectID int64, number int) (*Issue, error)
	Query(ctx context.Context, projectID int64, q string) ([]*Issue, error)
	Create(ctx context.Context, issue *Issue) (*Issue, error)
	Update(ctx context.Context, issue *Issue) (*Issue, error)
}
