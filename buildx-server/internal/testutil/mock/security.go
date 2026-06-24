package mock

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
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
	CreateSessionFunc              func(ctx context.Context, userID int64, rememberMe bool) (*security.Session, error)
	ValidateSessionFunc            func(ctx context.Context, token string) (*model.User, error)
	DeleteSessionFunc              func(ctx context.Context, token string) error
	CreateAccessTokenFunc          func(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error)
	ListAccessTokensFunc           func(ctx context.Context, ownerID int64) ([]*model.AccessToken, error)
	FindAccessTokenFunc            func(ctx context.Context, id int64) (*model.AccessToken, error)
	FindAccessTokenByOwnerAndNameFunc func(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error)
	DeleteAccessTokenFunc          func(ctx context.Context, id int64) error
	UpdateAccessTokenFunc          func(ctx context.Context, token *model.AccessToken) error
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

func (m *SecurityService) CreateSession(ctx context.Context, userID int64, rememberMe bool) (*security.Session, error) {
	if m.CreateSessionFunc == nil {
		panic("mock.SecurityService.CreateSessionFunc not set")
	}
	return m.CreateSessionFunc(ctx, userID, rememberMe)
}

func (m *SecurityService) ValidateSession(ctx context.Context, token string) (*model.User, error) {
	if m.ValidateSessionFunc == nil {
		panic("mock.SecurityService.ValidateSessionFunc not set")
	}
	return m.ValidateSessionFunc(ctx, token)
}

func (m *SecurityService) DeleteSession(ctx context.Context, token string) error {
	if m.DeleteSessionFunc == nil {
		panic("mock.SecurityService.DeleteSessionFunc not set")
	}
	return m.DeleteSessionFunc(ctx, token)
}

func (m *SecurityService) CreateAccessToken(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
	if m.CreateAccessTokenFunc == nil {
		panic("mock.SecurityService.CreateAccessTokenFunc not set")
	}
	return m.CreateAccessTokenFunc(ctx, ownerID, name)
}

func (m *SecurityService) ListAccessTokens(ctx context.Context, ownerID int64) ([]*model.AccessToken, error) {
	if m.ListAccessTokensFunc == nil {
		panic("mock.SecurityService.ListAccessTokensFunc not set")
	}
	return m.ListAccessTokensFunc(ctx, ownerID)
}

func (m *SecurityService) FindAccessToken(ctx context.Context, id int64) (*model.AccessToken, error) {
	if m.FindAccessTokenFunc == nil {
		panic("mock.SecurityService.FindAccessTokenFunc not set")
	}
	return m.FindAccessTokenFunc(ctx, id)
}

func (m *SecurityService) FindAccessTokenByOwnerAndName(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
	if m.FindAccessTokenByOwnerAndNameFunc == nil {
		panic("mock.SecurityService.FindAccessTokenByOwnerAndNameFunc not set")
	}
	return m.FindAccessTokenByOwnerAndNameFunc(ctx, ownerID, name)
}

func (m *SecurityService) DeleteAccessToken(ctx context.Context, id int64) error {
	if m.DeleteAccessTokenFunc == nil {
		panic("mock.SecurityService.DeleteAccessTokenFunc not set")
	}
	return m.DeleteAccessTokenFunc(ctx, id)
}

func (m *SecurityService) UpdateAccessToken(ctx context.Context, token *model.AccessToken) error {
	if m.UpdateAccessTokenFunc == nil {
		panic("mock.SecurityService.UpdateAccessTokenFunc not set")
	}
	return m.UpdateAccessTokenFunc(ctx, token)
}
