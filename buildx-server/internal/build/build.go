package build

import (
	"context"
)

// Service orchestrates build submission, execution, and log streaming (future CI engine).
type Service interface {
	Submit(ctx context.Context, projectID int64, job, branch string) (*modelBuild, error)
	Get(ctx context.Context, id int64) (*modelBuild, error)
	StreamLog(ctx context.Context, id int64) (<-chan string, error)
}

// modelBuild is a minimal alias kept for the future CI engine interface.
type modelBuild struct {
	ID        int64
	ProjectID int64
	Number    int
	Job       string
	Status    string
	Branch    string
	Commit    string
}
