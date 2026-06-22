// Package persistence abstracts persistent storage for metadata, blobs, and attachments.
//
// Maps to OneDev: io.onedev.server.persistence.*, DataService (metadata DB).
// Filesystem layout (repos, LFS, artifacts) is handled separately — not StorageService.
package persistence

import (
	"context"
	"database/sql"
)

const DataVersion = "1.0.0-mvp"

// Store provides transactional metadata persistence.
type Store interface {
	DB() *sql.DB
	Migrate(ctx context.Context) error
	Bootstrap(ctx context.Context) error
	Close() error
}
