// Package project defines the project domain — repositories, hierarchy, and permissions.
//
// Maps to OneDev: io.onedev.server.model.Project, ProjectService
package project

import "context"

// Project is a top-level or nested container for code, issues, builds, and packages.
type Project struct {
	ID          int64
	Name        string
	Path        string
	Description string
	ParentID    *int64
}

// Service manages project lifecycle and authorization.
type Service interface {
	Get(ctx context.Context, id int64) (*Project, error)
	GetByPath(ctx context.Context, path string) (*Project, error)
	List(ctx context.Context) ([]*Project, error)
	Create(ctx context.Context, p *Project) (*Project, error)
}
