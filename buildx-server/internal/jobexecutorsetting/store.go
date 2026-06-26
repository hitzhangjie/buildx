package jobexecutorsetting

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

const settingKey = "jobExecutors"

// SavedExecutor mirrors persisted admin job executor configuration (OneDev JobExecutor subset).
type SavedExecutor struct {
	Name     string `json:"name"`
	Type     string `json:"type,omitempty"`
	Enabled  bool   `json:"enabled"`
	JobMatch string `json:"jobMatch,omitempty"`
}

// DBStore persists job executor admin settings in o_Setting.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

// Get returns saved executors. Nil/empty means auto-discover mode (OneDev empty settings).
func (s *DBStore) Get(ctx context.Context) ([]SavedExecutor, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `SELECT o_value FROM o_Setting WHERE o_key = ?`, settingKey).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var list []SavedExecutor
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, err
	}
	return list, nil
}

// Save persists the full executor list — mirrors OneDev setJobExecutors.
func (s *DBStore) Save(ctx context.Context, list []SavedExecutor) error {
	raw, err := json.Marshal(list)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO o_Setting (o_key, o_value) VALUES (?, ?)
		ON CONFLICT(o_key) DO UPDATE SET o_value = excluded.o_value`,
		settingKey, raw)
	return err
}
