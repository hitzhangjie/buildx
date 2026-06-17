// Package security provides authentication, authorization, SSO, and access tokens.
//
// Maps to OneDev: io.onedev.server.security.*
package security

import "context"

// User represents an authenticated principal.
type User struct {
	ID       int64
	Name     string
	Email    string
	FullName string
}

// Service handles login, tokens, and permission checks.
type Service interface {
	Authenticate(ctx context.Context, token string) (*User, error)
	Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error)
}
