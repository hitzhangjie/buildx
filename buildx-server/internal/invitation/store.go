// Package invitation persists user invitations.
package invitation

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var ErrNotFound = errors.New("invitation not found")

// DBStore implements invitation persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) List(ctx context.Context) ([]*model.Invitation, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT o_id, o_emailAddress, o_invitationCode, o_role, o_createDate
		FROM o_UserInvitation
		ORDER BY o_emailAddress ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var invitations []*model.Invitation
	for rows.Next() {
		inv, err := scanInvitationRows(rows)
		if err != nil {
			return nil, err
		}
		invitations = append(invitations, inv)
	}
	return invitations, rows.Err()
}

func (s *DBStore) FindByID(ctx context.Context, id int64) (*model.Invitation, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_emailAddress, o_invitationCode, o_role, o_createDate
		FROM o_UserInvitation WHERE o_id = ?`, id)
	return scanInvitation(row)
}

func (s *DBStore) FindByEmail(ctx context.Context, email string) (*model.Invitation, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT o_id, o_emailAddress, o_invitationCode, o_role, o_createDate
		FROM o_UserInvitation WHERE o_emailAddress = ?`, email)
	return scanInvitation(row)
}

func (s *DBStore) Create(ctx context.Context, inv *model.Invitation) (*model.Invitation, error) {
	if inv == nil {
		return nil, errors.New("invitation is nil")
	}
	email := strings.TrimSpace(inv.EmailAddress)
	if email == "" {
		return nil, errors.New("email address is required")
	}
	if inv.InvitationCode == "" {
		inv.InvitationCode = uuid.NewString()
	}
	if inv.Role == "" {
		inv.Role = "developer"
	}
	if inv.CreateDate.IsZero() {
		inv.CreateDate = time.Now().UTC()
	}
	inv.EmailAddress = email

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_UserInvitation (o_emailAddress, o_invitationCode, o_role, o_createDate)
		VALUES (?, ?, ?, ?)`,
		inv.EmailAddress,
		inv.InvitationCode,
		inv.Role,
		inv.CreateDate.Format(time.RFC3339Nano),
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	inv.ID = id
	return inv, nil
}

func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_UserInvitation WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *DBStore) RefreshInvitationCode(ctx context.Context, id int64) (*model.Invitation, error) {
	code := uuid.NewString()
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_UserInvitation SET o_invitationCode = ? WHERE o_id = ?`, code, id)
	if err != nil {
		return nil, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if n == 0 {
		return nil, ErrNotFound
	}
	return s.FindByID(ctx, id)
}

func (s *DBStore) EmailInUse(ctx context.Context, email string) (bool, error) {
	var count int
	err := s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM o_EmailAddress WHERE o_value = ?`, strings.TrimSpace(email)).Scan(&count)
	if err != nil {
		return false, err
	}
	return count > 0, nil
}

func scanInvitation(row *sql.Row) (*model.Invitation, error) {
	var inv model.Invitation
	var createDate string
	err := row.Scan(&inv.ID, &inv.EmailAddress, &inv.InvitationCode, &inv.Role, &createDate)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	inv.CreateDate, err = parseCreateDate(createDate)
	if err != nil {
		return nil, fmt.Errorf("parse create date: %w", err)
	}
	return &inv, nil
}

func scanInvitationRows(rows *sql.Rows) (*model.Invitation, error) {
	var inv model.Invitation
	var createDate string
	if err := rows.Scan(&inv.ID, &inv.EmailAddress, &inv.InvitationCode, &inv.Role, &createDate); err != nil {
		return nil, err
	}
	var err error
	inv.CreateDate, err = parseCreateDate(createDate)
	if err != nil {
		return nil, fmt.Errorf("parse create date: %w", err)
	}
	return &inv, nil
}

func parseCreateDate(raw string) (time.Time, error) {
	if t, err := time.Parse(time.RFC3339Nano, raw); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, raw)
}
