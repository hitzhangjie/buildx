// Package mock provides hand-written mock implementations of service interfaces
// used by API handlers. Each mock uses function fields — set the function to
// control behavior; unset functions panic with a helpful message.
package mock

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// ProjectService implements the projectService interface expected by API handlers.
type ProjectService struct {
	GetFunc        func(ctx context.Context, id int64) (*model.Project, error)
	GetByPathFunc  func(ctx context.Context, path string) (*model.Project, error)
	ListFunc       func(ctx context.Context) ([]*model.Project, error)
	CreateFunc     func(ctx context.Context, userID int64, p *model.Project) (*model.Project, error)
	SetupFunc      func(ctx context.Context, userID int64, path string) (*model.Project, error)
	ProjectDirFunc func(projectID int64) string
	GitDirFunc     func(projectID int64) string
}

func (m *ProjectService) Get(ctx context.Context, id int64) (*model.Project, error) {
	if m.GetFunc == nil {
		panic("mock.ProjectService.GetFunc not set")
	}
	return m.GetFunc(ctx, id)
}

func (m *ProjectService) GetByPath(ctx context.Context, path string) (*model.Project, error) {
	if m.GetByPathFunc == nil {
		panic("mock.ProjectService.GetByPathFunc not set")
	}
	return m.GetByPathFunc(ctx, path)
}

func (m *ProjectService) List(ctx context.Context) ([]*model.Project, error) {
	if m.ListFunc == nil {
		panic("mock.ProjectService.ListFunc not set")
	}
	return m.ListFunc(ctx)
}

func (m *ProjectService) Create(ctx context.Context, userID int64, p *model.Project) (*model.Project, error) {
	if m.CreateFunc == nil {
		panic("mock.ProjectService.CreateFunc not set")
	}
	return m.CreateFunc(ctx, userID, p)
}

func (m *ProjectService) Setup(ctx context.Context, userID int64, path string) (*model.Project, error) {
	if m.SetupFunc == nil {
		panic("mock.ProjectService.SetupFunc not set")
	}
	return m.SetupFunc(ctx, userID, path)
}

func (m *ProjectService) ProjectDir(projectID int64) string {
	if m.ProjectDirFunc == nil {
		panic("mock.ProjectService.ProjectDirFunc not set")
	}
	return m.ProjectDirFunc(projectID)
}

func (m *ProjectService) GitDir(projectID int64) string {
	if m.GitDirFunc == nil {
		panic(fmt.Sprintf("mock.ProjectService.GitDirFunc not set (projectID=%d)", projectID))
	}
	return m.GitDirFunc(projectID)
}
