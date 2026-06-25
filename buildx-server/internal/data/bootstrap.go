package data

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const (
	envInitialUser     = "BUILDX_INITIAL_USER"
	envInitialPassword = "BUILDX_INITIAL_PASSWORD"
	envInitialEmail    = "BUILDX_INITIAL_EMAIL"
)

// Bootstrap seeds system users and default roles (OneDev checkData essentials).
func Bootstrap(ctx context.Context, db *sql.DB, dataDir string) error {
	if err := ensureSystemUsers(ctx, db); err != nil {
		return err
	}
	if err := ensureDefaultRoles(ctx, db); err != nil {
		return err
	}
	if err := ensureRootUser(ctx, db); err != nil {
		return err
	}
	return ensureSiteDirs(dataDir)
}

func ensureSystemUsers(ctx context.Context, db *sql.DB) error {
	users := []model.User{
		{
			ID:       model.UserSystemID,
			Name:     model.UserSystemName,
			FullName: model.UserSystemName,
			Type:     model.UserTypeService,
			Password: "no password",
		},
		{
			ID:       model.UserUnknownID,
			Name:     model.UserUnknownName,
			FullName: model.UserUnknownName,
			Type:     model.UserTypeOrdinary,
			Password: "no password",
		},
	}
	for _, u := range users {
		if err := replicateUser(ctx, db, u); err != nil {
			return err
		}
	}
	return nil
}

func ensureDefaultRoles(ctx context.Context, db *sql.DB) error {
	roles := []struct {
		id   int64
		name string
	}{
		{model.RoleOwnerID, "Project Owner"},
		{2, "Developer"},
		{3, "Viewer"},
		{4, "Code Writer"},
		{5, "Code Reader"},
	}
	for _, r := range roles {
		_, err := db.ExecContext(ctx,
			"INSERT OR IGNORE INTO o_Role (o_id, o_name) VALUES (?, ?)",
			r.id, r.name)
		if err != nil {
			return err
		}
	}
	return nil
}

func ensureRootUser(ctx context.Context, db *sql.DB) error {
	var count int
	if err := db.QueryRowContext(ctx, "SELECT COUNT(*) FROM o_User WHERE o_id = ?", model.UserRootID).Scan(&count); err != nil {
		return err
	}
	if count > 0 {
		slog.Debug("root user already exists, skipping bootstrap")
		return nil
	}

	name := os.Getenv(envInitialUser)
	password := os.Getenv(envInitialPassword)
	email := os.Getenv(envInitialEmail)
	if name == "" || password == "" || email == "" {
		slog.Warn("BUILDX_INITIAL_* env vars not set, skipping root user creation",
			"user", name, "password_set", password != "", "email", email)
		return nil
	}

	hash, err := security.HashPassword(password)
	if err != nil {
		return fmt.Errorf("hash initial password: %w", err)
	}

	user := model.User{
		ID:       model.UserRootID,
		Name:     name,
		FullName: name,
		Type:     model.UserTypeOrdinary,
		Password: hash,
	}
	if err := replicateUser(ctx, db, user); err != nil {
		return err
	}

	_, err = db.ExecContext(ctx, `
		INSERT INTO o_EmailAddress (o_value, o_owner_id, o_primary, o_git)
		VALUES (?, ?, 1, 1)
	`, email, model.UserRootID)
	if err != nil {
		return err
	}
	slog.Info("root user created from BUILDX_INITIAL_*", "name", name)
	return nil
}

func replicateUser(ctx context.Context, db *sql.DB, u model.User) error {
	_, err := db.ExecContext(ctx, `
		INSERT OR REPLACE INTO o_User (o_id, o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (?, ?, ?, ?, ?, ?)
	`, u.ID, u.Name, u.FullName, u.Type, boolToInt(u.Disabled), u.Password)
	return err
}

func ensureSiteDirs(dataDir string) error {
	dirs := []string{
		filepath.Join(dataDir, "site", "projects"),
		filepath.Join(dataDir, "internaldb"),
	}
	for _, dir := range dirs {
		if err := os.MkdirAll(dir, 0o750); err != nil {
			return fmt.Errorf("create site dir %s: %w", dir, err)
		}
	}
	return nil
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}
