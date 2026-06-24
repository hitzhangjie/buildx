package security

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/base64"
	"errors"
	"fmt"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"golang.org/x/crypto/bcrypt"
)

var (
	ErrInvalidCredentials = errors.New("invalid credentials")
	ErrUserDisabled       = errors.New("user disabled")
	ErrUnauthorized       = errors.New("unauthorized")
)

// PasswordService handles password hashing (OneDev uses BCrypt via Shiro).
func HashPassword(plain string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plain), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func CheckPassword(hash, plain string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plain)) == nil
}

// DBStore implements authentication against SQLite metadata.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) Authenticate(ctx context.Context, username, passwordOrToken string) (*model.User, error) {
	if username == "" || passwordOrToken == "" {
		return nil, ErrInvalidCredentials
	}

	user, err := s.findUserByNameOrEmail(ctx, username)
	if err != nil {
		return nil, err
	}
	if user != nil {
		if user.Disabled {
			return nil, ErrUserDisabled
		}
		if user.Type != model.UserTypeOrdinary {
			return nil, ErrInvalidCredentials
		}
		if CheckPassword(user.Password, passwordOrToken) {
			return user, nil
		}
	}

	tokenUser, err := s.authenticateByToken(ctx, username, passwordOrToken)
	if err != nil {
		return nil, err
	}
	if tokenUser != nil {
		return tokenUser, nil
	}
	return nil, ErrInvalidCredentials
}

func (s *DBStore) AuthenticateToken(ctx context.Context, token string) (*model.User, error) {
	if token == "" {
		return nil, ErrInvalidCredentials
	}
	return s.authenticateByTokenValue(ctx, token)
}

func (s *DBStore) GetUser(ctx context.Context, id int64) (*model.User, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_name, o_fullName, o_type, o_disabled, o_password
		FROM o_User WHERE o_id = ?
	`, id)
	return scanUser(row)
}

func (s *DBStore) FindUserByName(ctx context.Context, name string) (*model.User, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_name, o_fullName, o_type, o_disabled, o_password
		FROM o_User WHERE o_name = ?
	`, name)
	return scanUser(row)
}

func (s *DBStore) ListUsers(ctx context.Context) ([]*model.User, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT o_id, o_name, o_fullName, o_type, o_disabled, o_password
		FROM o_User
		WHERE o_type = ? AND o_id NOT IN (?, ?)
		ORDER BY o_name
	`, model.UserTypeOrdinary, model.UserUnknownID, model.UserSystemID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []*model.User
	for rows.Next() {
		u, err := scanUserRows(rows)
		if err != nil {
			return nil, err
		}
		users = append(users, u)
	}
	return users, rows.Err()
}

func (s *DBStore) HasLoginUser(ctx context.Context) (bool, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM o_User
		WHERE o_type = ? AND o_id NOT IN (?, ?)
	`, model.UserTypeOrdinary, model.UserUnknownID, model.UserSystemID).Scan(&count)
	return count > 0, err
}

func (s *DBStore) CreateUser(ctx context.Context, name, fullName, email, password string) (*model.User, error) {
	hash, err := HashPassword(password)
	if err != nil {
		return nil, err
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_User (o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (?, ?, ?, 0, ?)
	`, name, fullName, model.UserTypeOrdinary, hash)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if id == 0 {
		return s.FindUserByName(ctx, name)
	}
	if email != "" {
		if _, err := s.db.ExecContext(ctx, `
			INSERT INTO o_EmailAddress (o_value, o_owner_id, o_primary, o_git)
			VALUES (?, ?, 1, 1)
		`, email, id); err != nil {
			return nil, err
		}
	}
	return s.GetUser(ctx, id)
}

func (s *DBStore) FindAccessTokenByValue(ctx context.Context, value string) (*model.AccessToken, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_name, o_owner_id, o_value, o_hasOwnerPermissions, o_createDate, o_expireDate
		FROM o_AccessToken WHERE o_value = ?
	`, value)
	var t model.AccessToken
	var hasOwner int
	var createDate string
	var expireDate sql.NullString
	if err := row.Scan(&t.ID, &t.Name, &t.OwnerID, &t.Value, &hasOwner, &createDate, &expireDate); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	t.HasOwnerPermissions = hasOwner == 1
	return &t, nil
}

func (s *DBStore) IsProjectOwner(ctx context.Context, userID, projectID int64) (bool, error) {
	if userID == model.UserRootID {
		return true, nil
	}
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM o_UserAuthorization
		WHERE o_user_id = ? AND o_project_id = ? AND o_role_id = ?
	`, userID, projectID, model.RoleOwnerID).Scan(&count)
	return count > 0, err
}

func (s *DBStore) HasProjectAccess(ctx context.Context, userID, projectID int64) (bool, error) {
	if userID == model.UserRootID {
		return true, nil
	}
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM o_UserAuthorization
		WHERE o_user_id = ? AND o_project_id = ?
	`, userID, projectID).Scan(&count)
	return count > 0, err
}

func (s *DBStore) authenticateByToken(ctx context.Context, username, password string) (*model.User, error) {
	for _, candidate := range []string{username, password} {
		user, err := s.authenticateByTokenValue(ctx, candidate)
		if err != nil {
			return nil, err
		}
		if user != nil {
			return user, nil
		}
	}
	return nil, nil
}

func (s *DBStore) authenticateByTokenValue(ctx context.Context, token string) (*model.User, error) {
	at, err := s.FindAccessTokenByValue(ctx, token)
	if err != nil {
		return nil, err
	}
	if at == nil {
		return nil, nil
	}
	return s.GetUser(ctx, at.OwnerID)
}

func (s *DBStore) findUserByNameOrEmail(ctx context.Context, login string) (*model.User, error) {
	user, err := s.FindUserByName(ctx, login)
	if err != nil {
		return nil, err
	}
	if user != nil {
		return user, nil
	}
	row := s.db.QueryRowContext(ctx, `
		SELECT u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled, u.o_password
		FROM o_EmailAddress e
		JOIN o_User u ON u.o_id = e.o_owner_id
		WHERE e.o_value = ? AND e.o_primary = 1
	`, login)
	return scanUser(row)
}

func scanUser(row *sql.Row) (*model.User, error) {
	var u model.User
	var userType string
	var disabled int
	err := row.Scan(&u.ID, &u.Name, &u.FullName, &userType, &disabled, &u.Password)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	u.Type = model.UserType(userType)
	u.Disabled = disabled == 1
	return &u, nil
}

func scanUserRows(rows *sql.Rows) (*model.User, error) {
	var u model.User
	var userType string
	var disabled int
	if err := rows.Scan(&u.ID, &u.Name, &u.FullName, &userType, &disabled, &u.Password); err != nil {
		return nil, err
	}
	u.Type = model.UserType(userType)
	u.Disabled = disabled == 1
	return &u, nil
}

// GenerateSecret creates a random access token value.
func GenerateSecret() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// CreateAccessToken creates a personal access token for a user.
func (s *DBStore) CreateAccessToken(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
	value, err := GenerateSecret()
	if err != nil {
		return nil, err
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_AccessToken (o_name, o_owner_id, o_value, o_hasOwnerPermissions, o_createDate)
		VALUES (?, ?, ?, 0, datetime('now'))
	`, name, ownerID, value)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &model.AccessToken{
		ID:      id,
		Name:    name,
		OwnerID: ownerID,
		Value:   value,
	}, nil
}

// ListAccessTokens returns all access tokens owned by a user.
func (s *DBStore) ListAccessTokens(ctx context.Context, ownerID int64) ([]*model.AccessToken, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT o_id, o_name, o_owner_id, o_hasOwnerPermissions, o_createDate, o_expireDate
		FROM o_AccessToken WHERE o_owner_id = ?
		ORDER BY o_createDate DESC
	`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tokens []*model.AccessToken
	for rows.Next() {
		var t model.AccessToken
		var hasOwner int
		var createDate string
		var expireDate sql.NullString
		if err := rows.Scan(&t.ID, &t.Name, &t.OwnerID, &hasOwner, &createDate, &expireDate); err != nil {
			return nil, err
		}
		t.HasOwnerPermissions = hasOwner == 1
		t.CreateDate, _ = time.Parse("2006-01-02 15:04:05", createDate)
		if expireDate.Valid {
			ed, _ := time.Parse("2006-01-02 15:04:05", expireDate.String)
			t.ExpireDate = &ed
		}
		tokens = append(tokens, &t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if tokens == nil {
		tokens = []*model.AccessToken{}
	}
	return tokens, nil
}

// FindAccessTokenByID returns a single access token by its primary key.
// Returns nil, nil when not found.
func (s *DBStore) FindAccessTokenByID(ctx context.Context, id int64) (*model.AccessToken, error) {
	return s.findAccessToken(ctx, id)
}

// FindAccessToken is an alias for FindAccessTokenByID, used by the API handler interface.
func (s *DBStore) FindAccessToken(ctx context.Context, id int64) (*model.AccessToken, error) {
	return s.findAccessToken(ctx, id)
}

// findAccessToken is the shared implementation for token lookup by ID.
func (s *DBStore) findAccessToken(ctx context.Context, id int64) (*model.AccessToken, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_name, o_owner_id, o_value, o_hasOwnerPermissions, o_createDate, o_expireDate
		FROM o_AccessToken WHERE o_id = ?
	`, id)
	var t model.AccessToken
	var hasOwner int
	var createDate string
	var expireDate sql.NullString
	if err := row.Scan(&t.ID, &t.Name, &t.OwnerID, &t.Value, &hasOwner, &createDate, &expireDate); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	t.HasOwnerPermissions = hasOwner == 1
	t.CreateDate, _ = time.Parse("2006-01-02 15:04:05", createDate)
	if expireDate.Valid {
		ed, _ := time.Parse("2006-01-02 15:04:05", expireDate.String)
		t.ExpireDate = &ed
	}
	return &t, nil
}

// FindAccessTokenByOwnerAndName looks up a token by owner + name for uniqueness validation.
// Returns nil, nil when not found.
func (s *DBStore) FindAccessTokenByOwnerAndName(ctx context.Context, ownerID int64, name string) (*model.AccessToken, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_name, o_owner_id, o_value, o_hasOwnerPermissions, o_createDate, o_expireDate
		FROM o_AccessToken WHERE o_owner_id = ? AND o_name = ?
	`, ownerID, name)
	var t model.AccessToken
	var hasOwner int
	var createDate string
	var expireDate sql.NullString
	if err := row.Scan(&t.ID, &t.Name, &t.OwnerID, &t.Value, &hasOwner, &createDate, &expireDate); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	t.HasOwnerPermissions = hasOwner == 1
	t.CreateDate, _ = time.Parse("2006-01-02 15:04:05", createDate)
	if expireDate.Valid {
		ed, _ := time.Parse("2006-01-02 15:04:05", expireDate.String)
		t.ExpireDate = &ed
	}
	return &t, nil
}

// DeleteAccessToken removes an access token by its primary key.
func (s *DBStore) DeleteAccessToken(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM o_AccessToken WHERE o_id = ?`, id)
	return err
}

// UpdateAccessToken updates mutable fields (name, hasOwnerPermissions, expireDate) of an access token.
// The value field is not updated through this method; regeneration is handled separately.
func (s *DBStore) UpdateAccessToken(ctx context.Context, token *model.AccessToken) error {
	var expireDate any
	if token.ExpireDate != nil {
		expireDate = token.ExpireDate.Format("2006-01-02 15:04:05")
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE o_AccessToken SET o_name = ?, o_hasOwnerPermissions = ?, o_expireDate = ?
		WHERE o_id = ?
	`, token.Name, boolToInt(token.HasOwnerPermissions), expireDate, token.ID)
	return err
}

// Authorize checks whether a user may perform an action on a project.
func (s *DBStore) Authorize(ctx context.Context, userID, projectID int64, action string) (bool, error) {
	switch action {
	case "read", "write", "manage":
		return s.HasProjectAccess(ctx, userID, projectID)
	default:
		return false, fmt.Errorf("unknown action %q", action)
	}
}

const (
	defaultSessionTTL      = 5 * time.Hour       // matches OneDev's 300-minute default
	rememberMeSessionTTL   = 30 * 24 * time.Hour // 30 days
	sessionCleanupInterval = 1 * time.Hour
)

// CreateSession creates a new login session. If rememberMe is true, the session
// has a 30-day expiry; otherwise it uses the default 5-hour window.
func (s *DBStore) CreateSession(ctx context.Context, userID int64, rememberMe bool) (*Session, error) {
	token, err := GenerateSecret()
	if err != nil {
		return nil, err
	}

	ttl := defaultSessionTTL
	if rememberMe {
		ttl = rememberMeSessionTTL
	}

	now := time.Now()
	expireDate := now.Add(ttl)

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO o_Session (o_token, o_user_id, o_createDate, o_expireDate, o_rememberMe)
		VALUES (?, ?, ?, ?, ?)
	`, token, userID, now.Format(time.RFC3339), expireDate.Format(time.RFC3339), boolToInt(rememberMe))
	if err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	return &Session{
		Token:      token,
		UserID:     userID,
		CreateDate: now,
		ExpireDate: expireDate,
		RememberMe: rememberMe,
	}, nil
}

// ValidateSession looks up a session token, checks expiry, and validates the
// associated user still exists and is not disabled. Returns the user on success.
func (s *DBStore) ValidateSession(ctx context.Context, token string) (*model.User, error) {
	if token == "" {
		return nil, nil
	}

	var userID int64
	var expireDateStr string
	err := s.db.QueryRowContext(ctx, `
		SELECT o_user_id, o_expireDate FROM o_Session WHERE o_token = ?
	`, token).Scan(&userID, &expireDateStr)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, fmt.Errorf("validate session: %w", err)
	}

	expireDate, err := time.Parse(time.RFC3339, expireDateStr)
	if err != nil {
		return nil, fmt.Errorf("parse session expiry: %w", err)
	}
	if time.Now().After(expireDate) {
		// Clean up expired session.
		_, _ = s.db.ExecContext(ctx, `DELETE FROM o_Session WHERE o_token = ?`, token)
		return nil, nil
	}

	user, err := s.GetUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	if user == nil || user.Disabled {
		// User gone or disabled — clean up the session.
		_, _ = s.db.ExecContext(ctx, `DELETE FROM o_Session WHERE o_token = ?`, token)
		return nil, nil
	}

	return user, nil
}

// DeleteSession removes a session by token (used for logout).
func (s *DBStore) DeleteSession(ctx context.Context, token string) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM o_Session WHERE o_token = ?`, token)
	return err
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}
