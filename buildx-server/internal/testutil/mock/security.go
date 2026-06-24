package mock

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// SecurityService implements the securityService interface expected by API handlers.
type SecurityService struct {
	AuthenticateFunc      func(ctx context.Context, username, password string) (*model.User, error)
	AuthenticateTokenFunc func(ctx context.Context, token string) (*model.User, error)
	HasLoginUserFunc      func(ctx context.Context) (bool, error)
	ListUsersFunc         func(ctx context.Context) ([]*model.User, error)
	CreateUserFunc        func(ctx context.Context, name, fullName, email, password string) (*model.User, error)
	HasProjectAccessFunc  func(ctx context.Context, userID, projectID int64) (bool, error)
	IsProjectOwnerFunc    func(ctx context.Context, userID, projectID int64) (bool, error)
	AuthorizeFunc         func(ctx context.Context, userID, projectID int64, action string) (bool, error)
}

func (m *SecurityService) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	if m.AuthenticateFunc == nil {
		panic("mock.SecurityService.AuthenticateFunc not set")
	}
	return m.AuthenticateFunc(ctx, username, password)
}

func (m *SecurityService) AuthenticateToken(ctx context.Context, token string) (*model.User, error) {
	if m.AuthenticateTokenFunc == nil {
		panic("mock.SecurityService.AuthenticateTokenFunc not set")
	}
	return m.AuthenticateTokenFunc(ctx, token)
}

func (m *SecurityService) HasLoginUser(ctx context.Context) (bool, error) {
	if m.HasLoginUserFunc == nil {
		panic("mock.SecurityService.HasLoginUserFunc not set")
	}
	return m.HasLoginUserFunc(ctx)
}

func (m *SecurityService) ListUsers(ctx context.Context) ([]*model.User, error) {
	if m.ListUsersFunc == nil {
		panic("mock.SecurityService.ListUsersFunc not set")
	}
	return m.ListUsersFunc(ctx)
}

func (m *SecurityService) CreateUser(ctx context.Context, name, fullName, email, password string) (*model.User, error) {
	if m.CreateUserFunc == nil {
		panic("mock.SecurityService.CreateUserFunc not set")
	}
	return m.CreateUserFunc(ctx, name, fullName, email, password)
}

func (m *SecurityService) HasProjectAccess(ctx context.Context, userID, projectID int64) (bool, error) {
	if m.HasProjectAccessFunc == nil {
		panic("mock.SecurityService.HasProjectAccessFunc not set")
	}
	return m.HasProjectAccessFunc(ctx, userID, projectID)
}

func (m *SecurityService) IsProjectOwner(ctx context.Context, userID, projectID int64) (bool, error) {
	if m.IsProjectOwnerFunc == nil {
		panic("mock.SecurityService.IsProjectOwnerFunc not set")
	}
	return m.IsProjectOwnerFunc(ctx, userID, projectID)
}

func (m *SecurityService) Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error) {
	if m.AuthorizeFunc == nil {
		panic("mock.SecurityService.AuthorizeFunc not set")
	}
	return m.AuthorizeFunc(ctx, userID, projectID, action)
}
