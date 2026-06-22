// Package security provides authentication, authorization, SSO, and access tokens.
//
// Maps to OneDev: io.onedev.server.security.*
package security

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// User represents an authenticated principal.
type User = model.User

// Service handles login, tokens, and permission checks.
type Service interface {
	Authenticate(ctx context.Context, username, password string) (*User, error)
	AuthenticateToken(ctx context.Context, token string) (*User, error)
	Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error)
}
