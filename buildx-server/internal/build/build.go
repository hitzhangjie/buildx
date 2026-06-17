// Package build defines build pipelines, job execution, and buildspec parsing.
//
// Maps to OneDev: io.onedev.server.build.*, JobService, BuildService
package build

import "context"

// BuildStatus represents the outcome of a pipeline run.
type BuildStatus string

const (
	StatusPending    BuildStatus = "pending"
	StatusRunning    BuildStatus = "running"
	StatusSuccessful BuildStatus = "successful"
	StatusFailed     BuildStatus = "failed"
	StatusCancelled  BuildStatus = "cancelled"
)

// Build is a single CI/CD pipeline execution.
type Build struct {
	ID        int64
	ProjectID int64
	Number    int
	Job       string
	Status    BuildStatus
	Branch    string
	Commit    string
}

// Service orchestrates build submission, execution, and log streaming.
type Service interface {
	Submit(ctx context.Context, projectID int64, job, branch string) (*Build, error)
	Get(ctx context.Context, id int64) (*Build, error)
	StreamLog(ctx context.Context, id int64) (<-chan string, error)
}
