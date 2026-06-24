// Package pullrequest persists and manages pull request lifecycle.
//
// Maps to OneDev: io.onedev.server.service.PullRequestService
package pullrequest

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var (
	ErrNotFound       = errors.New("pull request not found")
	ErrBranchNotFound = errors.New("branch not found")
	ErrNotOpen        = errors.New("pull request is not open")
	ErrMergeConflict  = errors.New("merge conflicts")
)

// DBStore implements pull request persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) Create(ctx context.Context, pr *model.PullRequest, submitterID int64) (*model.PullRequest, error) {
	if pr == nil {
		return nil, errors.New("pull request is nil")
	}
	title := strings.TrimSpace(pr.Title)
	if title == "" {
		return nil, errors.New("title is required")
	}
	if len(title) > model.PullRequestMaxTitleLen {
		return nil, fmt.Errorf("title exceeds %d characters", model.PullRequestMaxTitleLen)
	}
	if len(pr.Description) > model.PullRequestMaxDescriptionLen {
		return nil, fmt.Errorf("description exceeds %d characters", model.PullRequestMaxDescriptionLen)
	}
	if pr.TargetProject == nil || pr.SourceProject == nil {
		return nil, errors.New("target and source projects are required")
	}
	targetBranch := strings.TrimSpace(pr.TargetBranch)
	sourceBranch := strings.TrimSpace(pr.SourceBranch)
	if targetBranch == "" || sourceBranch == "" {
		return nil, errors.New("target and source branches are required")
	}

	mergeStrategy := pr.MergeStrategy
	if mergeStrategy == "" {
		mergeStrategy = model.MergeStrategyCreateMergeCommitIfNecessary
	}
	submitDate := pr.SubmitDate
	if submitDate.IsZero() {
		submitDate = time.Now().UTC()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	var nextNumber int
	err = tx.QueryRowContext(ctx, `
		SELECT COALESCE(MAX(o_number), 0) + 1
		FROM o_PullRequest
		WHERE o_numberScope_id = ?`, pr.TargetProject.ID).Scan(&nextNumber)
	if err != nil {
		return nil, err
	}

	res, err := tx.ExecContext(ctx, `
		INSERT INTO o_PullRequest (
			o_number, o_numberScope_id, o_title, o_description, o_status,
			o_targetProject_id, o_sourceProject_id, o_targetBranch, o_sourceBranch,
			o_submitter_id, o_submitDate, o_mergeStrategy, o_baseCommitHash, o_buildCommitHash
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		nextNumber,
		pr.TargetProject.ID,
		title,
		pr.Description,
		model.PullRequestStatusOpen,
		pr.TargetProject.ID,
		pr.SourceProject.ID,
		targetBranch,
		sourceBranch,
		submitterID,
		submitDate.Format(time.RFC3339Nano),
		mergeStrategy,
		pr.BaseCommitHash,
		pr.BuildCommitHash,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.Get(ctx, id)
}

func (s *DBStore) Get(ctx context.Context, id int64) (*model.PullRequest, error) {
	row := s.db.QueryRowContext(ctx, pullRequestSelect+" WHERE pr.o_id = ?", id)
	pr, err := scanPullRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return pr, err
}

func (s *DBStore) GetByNumber(ctx context.Context, projectID int64, number int) (*model.PullRequest, error) {
	row := s.db.QueryRowContext(ctx, pullRequestSelect+`
		WHERE pr.o_numberScope_id = ? AND pr.o_number = ?`, projectID, number)
	pr, err := scanPullRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return pr, err
}

type QueryOptions struct {
	TargetProjectID      *int64
	Status               *model.PullRequestStatus
	IncludesIssueNumber  int
	IncludesIssuePattern string
	Offset               int
	Count                int
}

func (s *DBStore) Query(ctx context.Context, opts QueryOptions) ([]*model.PullRequest, error) {
	if opts.Count <= 0 {
		opts.Count = 100
	}
	if opts.Count > 500 {
		opts.Count = 500
	}
	if opts.Offset < 0 {
		opts.Offset = 0
	}

	query := pullRequestSelect + " WHERE 1=1"
	args := make([]any, 0, 4)
	if opts.TargetProjectID != nil {
		query += " AND pr.o_targetProject_id = ?"
		args = append(args, *opts.TargetProjectID)
	}
	if opts.Status != nil {
		query += " AND pr.o_status = ?"
		args = append(args, *opts.Status)
	}
	if opts.IncludesIssueNumber > 0 && opts.IncludesIssuePattern != "" {
		query += " AND (pr.o_description LIKE ? OR pr.o_title LIKE ?)"
		args = append(args, opts.IncludesIssuePattern, opts.IncludesIssuePattern)
	}
	query += " ORDER BY pr.o_submitDate DESC LIMIT ? OFFSET ?"
	args = append(args, opts.Count, opts.Offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var requests []*model.PullRequest
	for rows.Next() {
		pr, err := scanPullRequestRows(rows)
		if err != nil {
			return nil, err
		}
		requests = append(requests, pr)
	}
	return requests, rows.Err()
}

// FindEffective returns an open pull request or a merged pull request whose build
// commit still matches the source branch tip.
func (s *DBStore) FindEffective(
	ctx context.Context,
	targetProjectID int64,
	targetBranch string,
	sourceProjectID int64,
	sourceBranch string,
	sourceCommitHash string,
) (*model.PullRequest, error) {
	row := s.db.QueryRowContext(ctx, pullRequestSelect+`
		WHERE pr.o_targetProject_id = ?
		  AND pr.o_targetBranch = ?
		  AND pr.o_sourceProject_id = ?
		  AND pr.o_sourceBranch = ?
		  AND (
		    pr.o_status = ?
		    OR (pr.o_status = ? AND pr.o_buildCommitHash = ?)
		  )
		ORDER BY pr.o_submitDate DESC
		LIMIT 1`,
		targetProjectID,
		targetBranch,
		sourceProjectID,
		sourceBranch,
		model.PullRequestStatusOpen,
		model.PullRequestStatusMerged,
		sourceCommitHash,
	)
	pr, err := scanPullRequest(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	return pr, err
}

func (s *DBStore) SetTitle(ctx context.Context, id int64, title string) error {
	title = strings.TrimSpace(title)
	if title == "" {
		return errors.New("title is required")
	}
	res, err := s.db.ExecContext(ctx, `UPDATE o_PullRequest SET o_title = ? WHERE o_id = ?`, title, id)
	if err != nil {
		return err
	}
	return ensureUpdated(res, ErrNotFound)
}

func (s *DBStore) SetMergeStrategy(ctx context.Context, id int64, strategy model.MergeStrategy) error {
	res, err := s.db.ExecContext(ctx, `UPDATE o_PullRequest SET o_mergeStrategy = ? WHERE o_id = ?`, strategy, id)
	if err != nil {
		return err
	}
	return ensureUpdated(res, ErrNotFound)
}

func (s *DBStore) DeleteReview(ctx context.Context, requestID, userID int64) error {
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_PullRequestReview
		SET o_status = ?, o_date = ?
		WHERE o_request_id = ? AND o_user_id = ?`,
		model.PullRequestReviewExcluded,
		time.Now().UTC().Format(time.RFC3339Nano),
		requestID,
		userID,
	)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return errors.New("review not found")
	}
	return nil
}

func (s *DBStore) SetDescription(ctx context.Context, id int64, description string) error {
	if len(description) > model.PullRequestMaxDescriptionLen {
		return fmt.Errorf("description exceeds %d characters", model.PullRequestMaxDescriptionLen)
	}
	res, err := s.db.ExecContext(ctx, `UPDATE o_PullRequest SET o_description = ? WHERE o_id = ?`, description, id)
	if err != nil {
		return err
	}
	return ensureUpdated(res, ErrNotFound)
}

func (s *DBStore) SetStatus(ctx context.Context, id int64, status model.PullRequestStatus, closeDate *time.Time) error {
	var closeVal any
	if closeDate != nil && !closeDate.IsZero() {
		closeVal = closeDate.Format(time.RFC3339Nano)
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_PullRequest
		SET o_status = ?, o_closeDate = ?
		WHERE o_id = ?`, status, closeVal, id)
	if err != nil {
		return err
	}
	return ensureUpdated(res, ErrNotFound)
}

func (s *DBStore) SetBuildCommitHash(ctx context.Context, id int64, hash string) error {
	res, err := s.db.ExecContext(ctx, `UPDATE o_PullRequest SET o_buildCommitHash = ? WHERE o_id = ?`, hash, id)
	if err != nil {
		return err
	}
	return ensureUpdated(res, ErrNotFound)
}

func (s *DBStore) CreateComment(ctx context.Context, comment *model.PullRequestComment) (*model.PullRequestComment, error) {
	if comment == nil || strings.TrimSpace(comment.Content) == "" {
		return nil, errors.New("content is required")
	}
	createDate := comment.CreateDate
	if createDate.IsZero() {
		createDate = time.Now().UTC()
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	res, err := tx.ExecContext(ctx, `
		INSERT INTO o_PullRequestComment (o_request_id, o_user_id, o_content, o_createDate)
		VALUES (?, ?, ?, ?)`,
		comment.RequestID,
		comment.User.ID,
		comment.Content,
		createDate.Format(time.RFC3339Nano),
	)
	if err != nil {
		return nil, err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE o_PullRequest SET o_commentCount = o_commentCount + 1 WHERE o_id = ?`, comment.RequestID); err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return s.GetComment(ctx, id)
}

func (s *DBStore) ListComments(ctx context.Context, requestID int64) ([]*model.PullRequestComment, error) {
	rows, err := s.db.QueryContext(ctx, commentSelect+`
		WHERE c.o_request_id = ?
		ORDER BY c.o_id`, requestID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []*model.PullRequestComment
	for rows.Next() {
		c, err := scanComment(rows)
		if err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

func (s *DBStore) GetComment(ctx context.Context, id int64) (*model.PullRequestComment, error) {
	row := s.db.QueryRowContext(ctx, commentSelect+" WHERE c.o_id = ?", id)
	c, err := scanComment(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("comment not found")
	}
	return c, err
}

func (s *DBStore) CreateOrUpdateReview(ctx context.Context, review *model.PullRequestReview) (*model.PullRequestReview, error) {
	if review == nil || review.User == nil {
		return nil, errors.New("review user is required")
	}
	now := time.Now().UTC()
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO o_PullRequestReview (o_request_id, o_user_id, o_status, o_date)
		VALUES (?, ?, ?, ?)
		ON CONFLICT(o_request_id, o_user_id) DO UPDATE SET
			o_status = excluded.o_status,
			o_date = excluded.o_date`,
		review.RequestID,
		review.User.ID,
		review.Status,
		now.Format(time.RFC3339Nano),
	)
	if err != nil {
		return nil, err
	}
	return s.GetReviewByUser(ctx, review.RequestID, review.User.ID)
}

func (s *DBStore) ListReviews(ctx context.Context, requestID int64) ([]*model.PullRequestReview, error) {
	rows, err := s.db.QueryContext(ctx, reviewSelect+`
		WHERE r.o_request_id = ? AND r.o_status != ?
		ORDER BY r.o_id`, requestID, model.PullRequestReviewExcluded)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var reviews []*model.PullRequestReview
	for rows.Next() {
		rv, err := scanReview(rows)
		if err != nil {
			return nil, err
		}
		reviews = append(reviews, rv)
	}
	return reviews, rows.Err()
}

func (s *DBStore) GetReviewByUser(ctx context.Context, requestID, userID int64) (*model.PullRequestReview, error) {
	row := s.db.QueryRowContext(ctx, reviewSelect+`
		WHERE r.o_request_id = ? AND r.o_user_id = ?`, requestID, userID)
	rv, err := scanReview(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, errors.New("review not found")
	}
	return rv, err
}

const pullRequestSelect = `
	SELECT pr.o_id, pr.o_number, pr.o_title, pr.o_description, pr.o_status,
		pr.o_submitDate, pr.o_closeDate, pr.o_targetBranch, pr.o_sourceBranch,
		pr.o_mergeStrategy, pr.o_baseCommitHash, pr.o_buildCommitHash, pr.o_commentCount,
		tp.o_id, tp.o_name, tp.o_path,
		sp.o_id, sp.o_name, sp.o_path,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
	FROM o_PullRequest pr
	JOIN o_Project tp ON tp.o_id = pr.o_targetProject_id
	JOIN o_Project sp ON sp.o_id = pr.o_sourceProject_id
	JOIN o_User u ON u.o_id = pr.o_submitter_id`

const commentSelect = `
	SELECT c.o_id, c.o_request_id, c.o_content, c.o_createDate,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
	FROM o_PullRequestComment c
	JOIN o_User u ON u.o_id = c.o_user_id`

const reviewSelect = `
	SELECT r.o_id, r.o_request_id, r.o_status, r.o_date,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled
	FROM o_PullRequestReview r
	JOIN o_User u ON u.o_id = r.o_user_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanPullRequest(row rowScanner) (*model.PullRequest, error) {
	return scanPullRequestFields(row)
}

func scanPullRequestRows(rows *sql.Rows) (*model.PullRequest, error) {
	return scanPullRequestFields(rows)
}

func scanPullRequestFields(row rowScanner) (*model.PullRequest, error) {
	var pr model.PullRequest
	var submitDate, closeDate sql.NullString
	var targetID int64
	var targetName, targetPath string
	var sourceID int64
	var sourceName, sourcePath string
	var submitter model.User
	var mergeStrategy string

	err := row.Scan(
		&pr.ID, &pr.Number, &pr.Title, &pr.Description, &pr.Status,
		&submitDate, &closeDate, &pr.TargetBranch, &pr.SourceBranch,
		&mergeStrategy, &pr.BaseCommitHash, &pr.BuildCommitHash, &pr.CommentCount,
		&targetID, &targetName, &targetPath,
		&sourceID, &sourceName, &sourcePath,
		&submitter.ID, &submitter.Name, &submitter.FullName, &submitter.Type, &submitter.Disabled,
	)
	if err != nil {
		return nil, err
	}
	pr.SubmitDate, _ = time.Parse(time.RFC3339Nano, submitDate.String)
	if closeDate.Valid {
		if t, err := time.Parse(time.RFC3339Nano, closeDate.String); err == nil {
			pr.CloseDate = &t
		}
	}
	pr.MergeStrategy = model.MergeStrategy(mergeStrategy)
	pr.TargetProject = &model.Project{ID: targetID, Name: targetName, Path: targetPath}
	pr.SourceProject = &model.Project{ID: sourceID, Name: sourceName, Path: sourcePath}
	pr.Submitter = &submitter
	return &pr, nil
}

func scanComment(row rowScanner) (*model.PullRequestComment, error) {
	var c model.PullRequestComment
	var createDate string
	var user model.User
	if err := row.Scan(
		&c.ID, &c.RequestID, &c.Content, &createDate,
		&user.ID, &user.Name, &user.FullName, &user.Type, &user.Disabled,
	); err != nil {
		return nil, err
	}
	c.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	c.User = &user
	return &c, nil
}

func scanReview(row rowScanner) (*model.PullRequestReview, error) {
	var rv model.PullRequestReview
	var date sql.NullString
	var user model.User
	if err := row.Scan(
		&rv.ID, &rv.RequestID, &rv.Status, &date,
		&user.ID, &user.Name, &user.FullName, &user.Type, &user.Disabled,
	); err != nil {
		return nil, err
	}
	if date.Valid {
		if t, err := time.Parse(time.RFC3339Nano, date.String); err == nil {
			rv.Date = &t
		}
	}
	rv.User = &user
	return &rv, nil
}

func ensureUpdated(res sql.Result, notFound error) error {
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return notFound
	}
	return nil
}
