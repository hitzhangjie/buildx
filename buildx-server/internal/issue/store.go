package issue

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

var ErrNotFound = errors.New("issue not found")
var ErrCommentNotFound = errors.New("issue comment not found")

// DBStore implements issue persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) Create(ctx context.Context, issue *model.Issue) (*model.Issue, error) {
	if issue == nil {
		return nil, errors.New("issue is nil")
	}
	title := strings.TrimSpace(issue.Title)
	if title == "" {
		return nil, errors.New("title is required")
	}
	if len(title) > model.IssueMaxTitleLen {
		return nil, fmt.Errorf("title exceeds %d characters", model.IssueMaxTitleLen)
	}
	if issue.ProjectID == 0 {
		return nil, errors.New("projectId is required")
	}
	if issue.Submitter == nil || issue.Submitter.ID == 0 {
		return nil, errors.New("submitter is required")
	}
	if issue.State == "" {
		issue.State = DefaultState
	}
	if issue.UUID == "" {
		issue.UUID = uuid.NewString()
	}
	if issue.SubmitDate.IsZero() {
		issue.SubmitDate = time.Now().UTC()
	}
	issue.StateOrdinal = StateOrdinal(issue.State)

	number, err := s.nextNumber(ctx, issue.ProjectID)
	if err != nil {
		return nil, err
	}
	issue.Number = number

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_Issue (
			o_project_id, o_number, o_title, o_description, o_state, o_stateOrdinal,
			o_submitter_id, o_submitDate, o_voteCount, o_commentCount, o_confidential, o_uuid
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
		issue.ProjectID,
		issue.Number,
		title,
		issue.Description,
		issue.State,
		issue.StateOrdinal,
		issue.Submitter.ID,
		issue.SubmitDate.Format(time.RFC3339Nano),
		boolToInt(issue.Confidential),
		issue.UUID,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	issue.ID = id
	issue.Title = title
	return s.Get(ctx, id)
}

func (s *DBStore) nextNumber(ctx context.Context, projectID int64) (int, error) {
	var max sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT MAX(o_number) FROM o_Issue WHERE o_project_id = ?`, projectID).Scan(&max)
	if err != nil {
		return 0, err
	}
	if !max.Valid {
		return 1, nil
	}
	return int(max.Int64) + 1, nil
}

func (s *DBStore) Get(ctx context.Context, id int64) (*model.Issue, error) {
	row := s.db.QueryRowContext(ctx, issueSelectSQL+` WHERE i.o_id = ?`, id)
	issue, err := scanIssue(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return issue, err
}

func (s *DBStore) GetByNumber(ctx context.Context, projectID int64, number int) (*model.Issue, error) {
	row := s.db.QueryRowContext(ctx, issueSelectSQL+` WHERE i.o_project_id = ? AND i.o_number = ?`, projectID, number)
	issue, err := scanIssue(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return issue, err
}

func (s *DBStore) Query(ctx context.Context, filter QueryFilter, offset, count int) ([]*model.Issue, error) {
	if count <= 0 {
		count = 100
	}
	if count > 500 {
		count = 500
	}
	if offset < 0 {
		offset = 0
	}

	var args []any
	query := issueSelectSQL + ` WHERE 1=1`

	if filter.ProjectID != 0 {
		query += ` AND i.o_project_id = ?`
		args = append(args, filter.ProjectID)
	} else if filter.ProjectPath != "" {
		query += ` AND p.o_path = ?`
		args = append(args, filter.ProjectPath)
	}
	if filter.NumberProjectPath != "" && filter.Number != 0 {
		query += ` AND p.o_path = ? AND i.o_number = ?`
		args = append(args, filter.NumberProjectPath, filter.Number)
	} else if filter.Number != 0 && filter.ProjectID != 0 {
		query += ` AND i.o_number = ?`
		args = append(args, filter.Number)
	}
	if filter.State != "" {
		query += ` AND i.o_state = ?`
		args = append(args, filter.State)
	}
	if filter.TitleContains != "" {
		query += ` AND LOWER(i.o_title) LIKE ?`
		args = append(args, "%"+strings.ToLower(filter.TitleContains)+"%")
	}
	if filter.IterationID != 0 {
		query += ` AND i.o_id IN (SELECT o_issue_id FROM o_IssueSchedule WHERE o_iteration_id = ?)`
		args = append(args, filter.IterationID)
	} else if filter.IterationName != "" {
		query += ` AND i.o_id IN (
			SELECT s.o_issue_id FROM o_IssueSchedule s
			JOIN o_Iteration it ON it.o_id = s.o_iteration_id
			WHERE it.o_name = ?`
		args = append(args, filter.IterationName)
		if filter.ProjectID != 0 {
			query += ` AND it.o_project_id = ?`
			args = append(args, filter.ProjectID)
		} else if filter.ProjectPath != "" {
			query += ` AND it.o_project_id = (SELECT o_id FROM o_Project WHERE o_path = ?)`
			args = append(args, filter.ProjectPath)
		}
		query += `)`
	} else if filter.UnscheduledOnly {
		query += ` AND i.o_id NOT IN (SELECT o_issue_id FROM o_IssueSchedule)`
	}

	query += ` ORDER BY i.o_submitDate DESC LIMIT ? OFFSET ?`
	args = append(args, count, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []*model.Issue
	for rows.Next() {
		issue, err := scanIssue(rows)
		if err != nil {
			return nil, err
		}
		issues = append(issues, issue)
	}
	return issues, rows.Err()
}

func (s *DBStore) UpdateTitle(ctx context.Context, id int64, title string) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return errors.New("title is required")
	}
	res, err := s.db.ExecContext(ctx, `UPDATE o_Issue SET o_title = ? WHERE o_id = ?`, title, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) UpdateDescription(ctx context.Context, id int64, description string) error {
	if len(description) > model.IssueMaxDescriptionLen {
		return fmt.Errorf("description exceeds %d characters", model.IssueMaxDescriptionLen)
	}
	res, err := s.db.ExecContext(ctx, `UPDATE o_Issue SET o_description = ? WHERE o_id = ?`, description, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) UpdateState(ctx context.Context, id int64, state string) error {
	state = strings.TrimSpace(state)
	if state == "" {
		return errors.New("state is required")
	}
	ordinal := StateOrdinal(state)
	res, err := s.db.ExecContext(ctx,
		`UPDATE o_Issue SET o_state = ?, o_stateOrdinal = ? WHERE o_id = ?`, state, ordinal, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_Issue WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) ListComments(ctx context.Context, issueID int64) ([]*model.IssueComment, error) {
	rows, err := s.db.QueryContext(ctx, commentSelectSQL+` WHERE c.o_issue_id = ? ORDER BY c.o_id`, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*model.IssueComment
	for rows.Next() {
		comment, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, comment)
	}
	return comments, rows.Err()
}

func (s *DBStore) CreateComment(ctx context.Context, comment *model.IssueComment) (*model.IssueComment, error) {
	if comment == nil {
		return nil, errors.New("comment is nil")
	}
	if comment.IssueID == 0 {
		return nil, errors.New("issue id is required")
	}
	if comment.User == nil || comment.User.ID == 0 {
		return nil, errors.New("user is required")
	}
	content := strings.TrimSpace(comment.Content)
	if content == "" {
		return nil, errors.New("content is required")
	}
	if len(content) > model.IssueCommentMaxContentLen {
		return nil, fmt.Errorf("content exceeds %d characters", model.IssueCommentMaxContentLen)
	}
	if comment.CreateDate.IsZero() {
		comment.CreateDate = time.Now().UTC()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO o_IssueComment (o_issue_id, o_user_id, o_content, o_createDate, o_revisionCount)
		VALUES (?, ?, ?, ?, 0)`,
		comment.IssueID, comment.User.ID, content, comment.CreateDate.Format(time.RFC3339Nano))
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE o_Issue SET o_commentCount = o_commentCount + 1 WHERE o_id = ?`, comment.IssueID); err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}

	comment.ID = id
	comment.Content = content
	return s.GetComment(ctx, id)
}

func (s *DBStore) GetComment(ctx context.Context, id int64) (*model.IssueComment, error) {
	row := s.db.QueryRowContext(ctx, commentSelectSQL+` WHERE c.o_id = ?`, id)
	comment, err := scanComment(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrCommentNotFound
	}
	return comment, err
}

func (s *DBStore) UpdateComment(ctx context.Context, id int64, content string) error {
	content = strings.TrimSpace(content)
	if content == "" {
		return errors.New("content is required")
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_IssueComment SET o_content = ?, o_revisionCount = o_revisionCount + 1 WHERE o_id = ?`,
		content, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrCommentNotFound)
}

func (s *DBStore) DeleteComment(ctx context.Context, id int64) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	var issueID int64
	err = tx.QueryRowContext(ctx, `SELECT o_issue_id FROM o_IssueComment WHERE o_id = ?`, id).Scan(&issueID)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrCommentNotFound
	}
	if err != nil {
		return err
	}

	res, err := tx.ExecContext(ctx, `DELETE FROM o_IssueComment WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrCommentNotFound
	}
	if _, err := tx.ExecContext(ctx,
		`UPDATE o_Issue SET o_commentCount = CASE WHEN o_commentCount > 0 THEN o_commentCount - 1 ELSE 0 END WHERE o_id = ?`, issueID); err != nil {
		return err
	}
	return tx.Commit()
}

const issueSelectSQL = `
	SELECT i.o_id, i.o_project_id, i.o_number, i.o_title, i.o_description, i.o_state, i.o_stateOrdinal,
		i.o_submitDate, i.o_voteCount, i.o_commentCount, i.o_confidential, i.o_uuid,
		p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_createDate,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
	FROM o_Issue i
	JOIN o_Project p ON p.o_id = i.o_project_id
	JOIN o_User u ON u.o_id = i.o_submitter_id`

const commentSelectSQL = `
	SELECT c.o_id, c.o_issue_id, c.o_content, c.o_createDate, c.o_revisionCount,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
	FROM o_IssueComment c
	JOIN o_User u ON u.o_id = c.o_user_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanIssue(row rowScanner) (*model.Issue, error) {
	var issue model.Issue
	var submitDate string
	var confidential int
	var proj model.Project
	var createDate string
	var submitter model.User
	var userType string
	var disabled int

	err := row.Scan(
		&issue.ID, &issue.ProjectID, &issue.Number, &issue.Title, &issue.Description,
		&issue.State, &issue.StateOrdinal, &submitDate, &issue.VoteCount, &issue.CommentCount,
		&confidential, &issue.UUID,
		&proj.ID, &proj.Name, &proj.Path, &proj.PathLen, &proj.Key, &proj.Description, &createDate,
		&submitter.ID, &submitter.Name, &submitter.FullName, &userType, &disabled,
	)
	if err != nil {
		return nil, err
	}
	issue.Confidential = confidential != 0
	issue.SubmitDate, _ = time.Parse(time.RFC3339Nano, submitDate)
	proj.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	issue.Project = &proj
	submitter.Type = model.UserType(userType)
	submitter.Disabled = disabled != 0
	issue.Submitter = &submitter
	return &issue, nil
}

func scanComment(row rowScanner) (*model.IssueComment, error) {
	var comment model.IssueComment
	var createDate string
	var user model.User
	var userType string
	var disabled int

	err := row.Scan(
		&comment.ID, &comment.IssueID, &comment.Content, &createDate, &comment.RevisionCount,
		&user.ID, &user.Name, &user.FullName, &userType, &disabled,
	)
	if err != nil {
		return nil, err
	}
	comment.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	user.Type = model.UserType(userType)
	user.Disabled = disabled != 0
	comment.User = &user
	return &comment, nil
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func affectedOne(res sql.Result, notFound error) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return notFound
	}
	return nil
}
