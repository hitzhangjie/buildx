// Package pullrequest defines code review workflows and merge strategies.
//
// Maps to OneDev: io.onedev.server.service.PullRequestService
package pullrequest

import "context"

// PullRequest represents a proposed merge between branches.
type PullRequest struct {
	ID          int64
	ProjectID   int64
	Number      int
	Title       string
	SourceBranch string
	TargetBranch string
	Status      string
}

// Service manages pull request lifecycle and reviews.
type Service interface {
	Get(ctx context.Context, projectID int64, number int) (*PullRequest, error)
	Query(ctx context.Context, projectID int64, q string) ([]*PullRequest, error)
	Merge(ctx context.Context, id int64) error
}
