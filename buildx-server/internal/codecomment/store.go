// Package codecomment persists code review comments on file selections.
package codecomment

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

var ErrNotFound = errors.New("code comment not found")

// DBStore implements code comment persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) Create(ctx context.Context, comment *model.CodeComment) (*model.CodeComment, error) {
	if comment == nil {
		return nil, errors.New("comment is nil")
	}
	if strings.TrimSpace(comment.Content) == "" {
		return nil, errors.New("content is required")
	}
	if len(comment.Content) > model.CodeCommentMaxContentLen {
		return nil, fmt.Errorf("content exceeds %d characters", model.CodeCommentMaxContentLen)
	}
	if comment.Mark.CommitHash == "" || comment.Mark.Path == "" || comment.Mark.Range == nil {
		return nil, errors.New("mark is required")
	}
	if comment.UUID == "" {
		comment.UUID = uuid.NewString()
	}
	if comment.CreateDate.IsZero() {
		comment.CreateDate = time.Now().UTC()
	}

	rangeVal := comment.Mark.Range
	tabWidth := rangeVal.TabWidth
	if tabWidth <= 0 {
		tabWidth = 1
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_CodeComment (
			o_project_id, o_user_id, o_content, o_createDate, o_replyCount, o_resolved, o_uuid,
			o_commitHash, o_path, o_fromRow, o_fromColumn, o_toRow, o_toColumn, o_tabWidth
		) VALUES (?, ?, ?, ?, 0, 0, ?, ?, ?, ?, ?, ?, ?, ?)`,
		comment.ProjectID,
		comment.User.ID,
		comment.Content,
		comment.CreateDate.Format(time.RFC3339Nano),
		comment.UUID,
		comment.Mark.CommitHash,
		comment.Mark.Path,
		rangeVal.FromRow,
		rangeVal.FromColumn,
		rangeVal.ToRow,
		rangeVal.ToColumn,
		tabWidth,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	comment.ID = id
	comment.ReplyCount = 0
	comment.Resolved = false
	return comment, nil
}

func (s *DBStore) Get(ctx context.Context, id int64) (*model.CodeComment, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT c.o_id, c.o_project_id, c.o_content, c.o_createDate, c.o_replyCount, c.o_resolved, c.o_uuid,
			c.o_commitHash, c.o_path, c.o_fromRow, c.o_fromColumn, c.o_toRow, c.o_toColumn, c.o_tabWidth,
			u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
		FROM o_CodeComment c
		JOIN o_User u ON u.o_id = c.o_user_id
		WHERE c.o_id = ?`, id)
	return scanComment(row)
}

func (s *DBStore) ListByMark(ctx context.Context, projectID int64, commitHash, path string) ([]*model.CodeComment, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.o_id, c.o_project_id, c.o_content, c.o_createDate, c.o_replyCount, c.o_resolved, c.o_uuid,
			c.o_commitHash, c.o_path, c.o_fromRow, c.o_fromColumn, c.o_toRow, c.o_toColumn, c.o_tabWidth,
			u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
		FROM o_CodeComment c
		JOIN o_User u ON u.o_id = c.o_user_id
		WHERE c.o_project_id = ? AND c.o_commitHash = ? AND c.o_path = ?
		ORDER BY c.o_id`, projectID, commitHash, path)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*model.CodeComment
	for rows.Next() {
		comment, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_CodeComment WHERE o_id = ?`, id)
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

type rowScanner interface {
	Scan(dest ...any) error
}

func scanComment(row rowScanner) (*model.CodeComment, error) {
	var (
		comment      model.CodeComment
		createDate   string
		resolved     int
		tabWidth     int
		userID       int64
		userName     string
		userFullName string
		userType     string
		userDisabled int
		rangeVal     model.PlanarRange
	)
	comment.Mark.Range = &rangeVal
	err := row.Scan(
		&comment.ID,
		&comment.ProjectID,
		&comment.Content,
		&createDate,
		&comment.ReplyCount,
		&resolved,
		&comment.UUID,
		&comment.Mark.CommitHash,
		&comment.Mark.Path,
		&comment.Mark.Range.FromRow,
		&comment.Mark.Range.FromColumn,
		&comment.Mark.Range.ToRow,
		&comment.Mark.Range.ToColumn,
		&tabWidth,
		&userID,
		&userName,
		&userFullName,
		&userType,
		&userDisabled,
	)
	if err == sql.ErrNoRows {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	parsed, err := time.Parse(time.RFC3339Nano, createDate)
	if err != nil {
		return nil, err
	}
	comment.CreateDate = parsed
	comment.Resolved = resolved != 0
	comment.Mark.Range.TabWidth = tabWidth
	comment.User = &model.User{
		ID:       userID,
		Name:     userName,
		FullName: userFullName,
		Type:     model.UserType(userType),
		Disabled: userDisabled != 0,
	}
	return &comment, nil
}
