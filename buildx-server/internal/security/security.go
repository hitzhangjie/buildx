// Package security provides authentication, authorization, SSO, and access tokens.
//
// Maps to OneDev: io.onedev.server.security.*
package security

import (
	"context"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// User represents an authenticated principal.
type User = model.User

// Session represents a login session stored in the database.
type Session struct {
	ID         int64
	Token      string
	UserID     int64
	CreateDate time.Time
	ExpireDate time.Time
	RememberMe bool
}

// Service handles login, tokens, session management, and permission checks.
type Service interface {
	Authenticate(ctx context.Context, username, password string) (*User, error)
	AuthenticateToken(ctx context.Context, token string) (*User, error)
	Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error)

	// Session management (cookie-based auth persistence).
	CreateSession(ctx context.Context, userID int64, rememberMe bool) (*Session, error)
	ValidateSession(ctx context.Context, token string) (*User, error)
	DeleteSession(ctx context.Context, token string) error
}

// Context key type to avoid collisions.
type contextKey string

const userContextKey contextKey = "buildx-user"

// WithUser stores an authenticated user in the context.
func WithUser(ctx context.Context, u *User) context.Context {
	return context.WithValue(ctx, userContextKey, u)
}

// UserFromContext retrieves the authenticated user from the context.
// Returns nil if no user is present.
func UserFromContext(ctx context.Context) *User {
	u, ok := ctx.Value(userContextKey).(*User)
	if !ok {
		return nil
	}
	return u
}
