package api

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// projectService is the interface API handlers need from the project package.
// *project.DBStore satisfies this implicitly.
type projectService interface {
	Get(ctx context.Context, id int64) (*model.Project, error)
	GetByPath(ctx context.Context, path string) (*model.Project, error)
	List(ctx context.Context) ([]*model.Project, error)
	Create(ctx context.Context, userID int64, p *model.Project) (*model.Project, error)
	Setup(ctx context.Context, userID int64, path string) (*model.Project, error)
	Delete(ctx context.Context, id int64) error
	ProjectDir(projectID int64) string
	GitDir(projectID int64) string
}

// securityService is the interface API handlers need from the security package.
// *security.DBStore satisfies this implicitly.
type securityService interface {
	Authenticate(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateToken(ctx context.Context, token string) (*model.User, error)
	HasLoginUser(ctx context.Context) (bool, error)
	ListUsers(ctx context.Context) ([]*model.User, error)
	CreateUser(ctx context.Context, name, fullName, email, password string) (*model.User, error)
	HasProjectAccess(ctx context.Context, userID, projectID int64) (bool, error)
	IsProjectOwner(ctx context.Context, userID, projectID int64) (bool, error)
	Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error)
}
