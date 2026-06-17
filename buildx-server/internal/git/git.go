// Package git provides Git protocol services: smart HTTP, SSH, LFS, and hooks.
//
// Maps to OneDev: io.onedev.server.git.*
package git

import "context"

// Repository represents a bare Git repository on disk.
type Repository struct {
	ProjectID int64
	Path      string
}

// Service handles Git operations and reference management.
type Service interface {
	Open(ctx context.Context, projectID int64) (*Repository, error)
	ReceivePack(ctx context.Context, repo *Repository) error
	UploadPack(ctx context.Context, repo *Repository) error
}
