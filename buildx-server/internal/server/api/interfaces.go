package api

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
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
	Stats(ctx context.Context, projectID int64) (*git.ProjectStats, error)
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

	// Access token management.
	CreateAccessToken(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error)
	ListAccessTokens(ctx context.Context, ownerID int64) ([]*model.AccessToken, error)
	FindAccessToken(ctx context.Context, id int64) (*model.AccessToken, error)
	FindAccessTokenByOwnerAndName(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error)
	DeleteAccessToken(ctx context.Context, id int64) error
	UpdateAccessToken(ctx context.Context, token *model.AccessToken) error

	// Session management.
	CreateSession(ctx context.Context, userID int64, rememberMe bool) (*security.Session, error)
	ValidateSession(ctx context.Context, token string) (*model.User, error)
	DeleteSession(ctx context.Context, token string) error
}
