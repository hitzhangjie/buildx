// Package mock provides hand-written mock implementations of service interfaces
// used by API handlers. Each mock uses function fields — set the function to
// control behavior; unset functions panic with a helpful message.
package mock

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// ProjectService implements the projectService interface expected by API handlers.
type ProjectService struct {
	GetFunc           func(ctx context.Context, id int64) (*model.Project, error)
	GetByPathFunc     func(ctx context.Context, path string) (*model.Project, error)
	ListFunc          func(ctx context.Context) ([]*model.Project, error)
	CreateFunc        func(ctx context.Context, userID int64, p *model.Project) (*model.Project, error)
	SetupFunc         func(ctx context.Context, userID int64, path string) (*model.Project, error)
	MoveFunc          func(ctx context.Context, projectID int64, newParentID *int64) (*model.Project, error)
	ListChildrenFunc  func(ctx context.Context, parentID int64) ([]*model.Project, error)
	CountChildrenFunc func(ctx context.Context, parentID int64) (int, error)
	DeleteFunc        func(ctx context.Context, id int64) error
	ProjectDirFunc    func(projectID int64) string
	GitDirFunc        func(projectID int64) string
	StatsFunc         func(ctx context.Context, projectID int64) (*git.ProjectStats, error)
	UpdateFunc        func(ctx context.Context, p *model.Project) error
	GetSettingFunc    func(ctx context.Context, id int64) (*model.ProjectSetting, error)
	UpdateSettingFunc func(ctx context.Context, id int64, setting *model.ProjectSetting) error
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

func (m *ProjectService) Delete(ctx context.Context, id int64) error {
	if m.DeleteFunc == nil {
		panic("mock.ProjectService.DeleteFunc not set")
	}
	return m.DeleteFunc(ctx, id)
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

func (m *ProjectService) Move(ctx context.Context, projectID int64, newParentID *int64) (*model.Project, error) {
	if m.MoveFunc == nil {
		return nil, fmt.Errorf("mock.ProjectService.MoveFunc not set")
	}
	return m.MoveFunc(ctx, projectID, newParentID)
}

func (m *ProjectService) ListChildren(ctx context.Context, parentID int64) ([]*model.Project, error) {
	if m.ListChildrenFunc == nil {
		return nil, nil // safe default — most tests don't need children
	}
	return m.ListChildrenFunc(ctx, parentID)
}

func (m *ProjectService) CountChildren(ctx context.Context, parentID int64) (int, error) {
	if m.CountChildrenFunc == nil {
		return 0, nil // safe default — most tests don't need child counts
	}
	return m.CountChildrenFunc(ctx, parentID)
}

func (m *ProjectService) Stats(ctx context.Context, projectID int64) (*git.ProjectStats, error) {
	if m.StatsFunc == nil {
		return nil, nil // no stats is not an error — tests that don't set this get nil stats
	}
	return m.StatsFunc(ctx, projectID)
}

func (m *ProjectService) Update(ctx context.Context, p *model.Project) error {
	if m.UpdateFunc == nil {
		panic("mock.ProjectService.UpdateFunc not set")
	}
	return m.UpdateFunc(ctx, p)
}

func (m *ProjectService) GetSetting(ctx context.Context, id int64) (*model.ProjectSetting, error) {
	if m.GetSettingFunc == nil {
		panic("mock.ProjectService.GetSettingFunc not set")
	}
	return m.GetSettingFunc(ctx, id)
}

func (m *ProjectService) UpdateSetting(ctx context.Context, id int64, setting *model.ProjectSetting) error {
	if m.UpdateSettingFunc == nil {
		panic("mock.ProjectService.UpdateSettingFunc not set")
	}
	return m.UpdateSettingFunc(ctx, id, setting)
}
