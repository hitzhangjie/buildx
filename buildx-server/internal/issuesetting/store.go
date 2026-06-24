package issuesetting

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

const settingKey = "issueSetting"

// DBStore persists global issue settings in o_Setting.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

// Get returns issue settings, seeding defaults when missing.
func (s *DBStore) Get(ctx context.Context) (*GlobalIssueSetting, error) {
	var raw []byte
	err := s.db.QueryRowContext(ctx, `SELECT o_value FROM o_Setting WHERE o_key = ?`, settingKey).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return Default(), nil
	}
	if err != nil {
		return nil, err
	}
	var setting GlobalIssueSetting
	if err := json.Unmarshal(raw, &setting); err != nil {
		return nil, err
	}
	if len(setting.StateSpecs) == 0 {
		def := Default()
		setting.StateSpecs = def.StateSpecs
	}
	if len(setting.BoardSpecs) == 0 {
		def := Default()
		setting.BoardSpecs = def.BoardSpecs
	}
	return &setting, nil
}

// Save persists issue settings.
func (s *DBStore) Save(ctx context.Context, setting *GlobalIssueSetting) error {
	if setting == nil {
		return errors.New("setting is nil")
	}
	raw, err := json.Marshal(setting)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		INSERT INTO o_Setting (o_key, o_value) VALUES (?, ?)
		ON CONFLICT(o_key) DO UPDATE SET o_value = excluded.o_value`,
		settingKey, raw)
	return err
}
