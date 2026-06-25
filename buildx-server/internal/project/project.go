// Package project defines the project domain — repositories, hierarchy, and permissions.
//
// Maps to OneDev: io.onedev.server.model.Project, ProjectService
package project

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// Project is a top-level or nested container for code, issues, builds, and packages.
type Project = model.Project

// ProjectSetting is an alias for model.ProjectSetting.
type ProjectSetting = model.ProjectSetting

// Service manages project lifecycle and authorization.
type Service interface {
	Get(ctx context.Context, id int64) (*Project, error)
	GetByPath(ctx context.Context, path string) (*Project, error)
	List(ctx context.Context) ([]*Project, error)
	Create(ctx context.Context, userID int64, p *Project) (*Project, error)
	Setup(ctx context.Context, userID int64, path string) (*Project, error)
	Move(ctx context.Context, projectID int64, newParentID *int64) (*Project, error)
	ListChildren(ctx context.Context, parentID int64) ([]*Project, error)
	CountChildren(ctx context.Context, parentID int64) (int, error)
	Delete(ctx context.Context, id int64) error
	ProjectDir(projectID int64) string
	GitDir(projectID int64) string
	Stats(ctx context.Context, projectID int64) (*git.ProjectStats, error)

	// Project settings — mirrors OneDev's project update and settings endpoints.
	Update(ctx context.Context, p *Project) error
	GetSetting(ctx context.Context, id int64) (*ProjectSetting, error)
	UpdateSetting(ctx context.Context, id int64, setting *ProjectSetting) error
}
