// Package persistence abstracts persistent storage for metadata, blobs, and attachments.
//
// Maps to OneDev: io.onedev.server.StorageService, persistence layer
package persistence

import "context"

// Store provides transactional metadata persistence.
type Store interface {
	Migrate(ctx context.Context) error
	Close() error
}
