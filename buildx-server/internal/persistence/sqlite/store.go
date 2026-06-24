package sqlite

import (
	"context"
	"database/sql"
	"embed"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/data"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence"
	_ "modernc.org/sqlite"
)

//go:embed migrations/*.sql
var migrationFS embed.FS

// Store is a SQLite-backed metadata store.
type Store struct {
	db      *sql.DB
	dataDir string
}

// Open creates or opens the SQLite database under dataDir.
func Open(dataDir string) (*Store, error) {
	dbPath := filepath.Join(dataDir, "buildx.db")
	if err := os.MkdirAll(dataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath+"?_pragma=foreign_keys(1)&_pragma=journal_mode(WAL)")
	if err != nil {
		return nil, fmt.Errorf("open sqlite: %w", err)
	}
	db.SetMaxOpenConns(1)

	return &Store{db: db, dataDir: dataDir}, nil
}

func (s *Store) DB() *sql.DB { return s.db }

func (s *Store) Migrate(ctx context.Context) error {
	// Run migrations in order. Each migration is idempotent (IF NOT EXISTS).
	migrations := []string{
		"migrations/001_initial.sql",
		"migrations/002_session.sql",
	}
	for _, name := range migrations {
		content, err := migrationFS.ReadFile(name)
		if err != nil {
			return fmt.Errorf("read %s: %w", name, err)
		}
		for _, stmt := range splitSQL(string(content)) {
			if _, err := s.db.ExecContext(ctx, stmt); err != nil {
				return fmt.Errorf("migrate %s: %w\nstatement: %s", name, err, stmt)
			}
		}
	}

	var count int
	if err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM o_ModelVersion").Scan(&count); err != nil {
		return fmt.Errorf("check model version: %w", err)
	}
	if count == 0 {
		if _, err := s.db.ExecContext(ctx,
			"INSERT INTO o_ModelVersion (o_id, o_versionColumn) VALUES (1, ?)",
			persistence.DataVersion,
		); err != nil {
			return fmt.Errorf("insert model version: %w", err)
		}
	}
	return nil
}

func (s *Store) Bootstrap(ctx context.Context) error {
	return data.Bootstrap(ctx, s.db, s.dataDir)
}

func (s *Store) Close() error {
	return s.db.Close()
}

func splitSQL(script string) []string {
	var stmts []string
	for _, part := range strings.Split(script, ";") {
		stmt := stripSQLComments(strings.TrimSpace(part))
		if stmt == "" {
			continue
		}
		stmts = append(stmts, stmt)
	}
	return stmts
}

func stripSQLComments(stmt string) string {
	lines := strings.Split(stmt, "\n")
	filtered := make([]string, 0, len(lines))
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "--") {
			continue
		}
		filtered = append(filtered, line)
	}
	return strings.TrimSpace(strings.Join(filtered, "\n"))
}
