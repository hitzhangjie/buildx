// Package build persists CI build metadata and supports OneDev-compatible queries.
//
// Maps to OneDev: io.onedev.server.build.*, BuildService
package build

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var ErrNotFound = errors.New("build not found")

// DBStore implements build persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

func (s *DBStore) Create(ctx context.Context, b *model.Build) (*model.Build, error) {
	if b == nil {
		return nil, errors.New("build is nil")
	}
	jobName := strings.TrimSpace(b.JobName)
	if jobName == "" {
		return nil, errors.New("jobName is required")
	}
	if b.ProjectID == 0 {
		return nil, errors.New("projectId is required")
	}
	if b.Submitter == nil || b.Submitter.ID == 0 {
		return nil, errors.New("submitter is required")
	}
	if b.Status == "" {
		b.Status = model.BuildStatusWaiting
	}
	if b.UUID == "" {
		b.UUID = uuid.NewString()
	}
	if b.SubmitDate.IsZero() {
		b.SubmitDate = time.Now().UTC()
	}
	if b.NumberScopeID == 0 {
		b.NumberScopeID = b.ProjectID
	}

	number, err := s.nextNumber(ctx, b.NumberScopeID)
	if err != nil {
		return nil, err
	}
	b.Number = number

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_Build (
			o_project_id, o_numberScope_id, o_number, o_jobName, o_status, o_refName, o_commitHash,
			o_version, o_description, o_submitDate, o_pendingDate, o_runningDate, o_finishDate,
			o_submitReason, o_submitter_id, o_canceller_id, o_paused, o_uuid
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		b.ProjectID,
		b.NumberScopeID,
		b.Number,
		jobName,
		string(b.Status),
		b.RefName,
		b.CommitHash,
		b.Version,
		b.Description,
		b.SubmitDate.Format(time.RFC3339Nano),
		formatOptionalTime(b.PendingDate),
		formatOptionalTime(b.RunningDate),
		formatOptionalTime(b.FinishDate),
		b.SubmitReason,
		b.Submitter.ID,
		optionalUserID(b.Canceller),
		boolToInt(b.Paused),
		b.UUID,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	b.ID = id
	b.JobName = jobName
	return s.Get(ctx, id)
}

func (s *DBStore) nextNumber(ctx context.Context, scopeID int64) (int, error) {
	var max sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT MAX(o_number) FROM o_Build WHERE o_numberScope_id = ?`, scopeID).Scan(&max)
	if err != nil {
		return 0, err
	}
	if !max.Valid {
		return 1, nil
	}
	return int(max.Int64) + 1, nil
}

func (s *DBStore) Get(ctx context.Context, id int64) (*model.Build, error) {
	row := s.db.QueryRowContext(ctx, buildSelectSQL+` WHERE b.o_id = ?`, id)
	build, err := scanBuild(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return build, err
}

func (s *DBStore) GetByNumber(ctx context.Context, projectID int64, number int) (*model.Build, error) {
	row := s.db.QueryRowContext(ctx,
		buildSelectSQL+` WHERE b.o_project_id = ? AND b.o_number = ?`, projectID, number)
	build, err := scanBuild(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return build, err
}

func (s *DBStore) Query(ctx context.Context, filter QueryFilter, offset, count int) ([]*model.Build, error) {
	if count <= 0 {
		count = 100
	}
	if count > 100 {
		count = 100
	}
	if offset < 0 {
		offset = 0
	}

	var args []any
	query := buildSelectSQL + ` WHERE 1=1`

	if filter.ProjectID != 0 {
		query += ` AND b.o_project_id = ?`
		args = append(args, filter.ProjectID)
	} else if filter.ProjectPath != "" {
		query += ` AND p.o_path = ?`
		args = append(args, filter.ProjectPath)
	}
	if filter.NumberProjectPath != "" && filter.Number != 0 {
		query += ` AND p.o_path = ? AND b.o_number = ?`
		args = append(args, filter.NumberProjectPath, filter.Number)
	} else if filter.Number != 0 && filter.ProjectID != 0 {
		query += ` AND b.o_number = ?`
		args = append(args, filter.Number)
	}
	if filter.JobName != "" {
		query += ` AND b.o_jobName = ?`
		args = append(args, filter.JobName)
	}
	if filter.Status != "" {
		query += ` AND b.o_status = ?`
		args = append(args, filter.Status)
	}
	if filter.RefName != "" {
		query += ` AND b.o_refName = ?`
		args = append(args, filter.RefName)
	}
	if filter.CommitHash != "" {
		query += ` AND b.o_commitHash = ?`
		args = append(args, filter.CommitHash)
	}
	if filter.FreeText != "" {
		query += ` AND (LOWER(b.o_jobName) LIKE ? OR CAST(b.o_number AS TEXT) LIKE ?)`
		pattern := "%" + strings.ToLower(filter.FreeText) + "%"
		args = append(args, pattern, pattern)
	}

	orderBy := `b.o_submitDate DESC`
	if filter.OrderByFinishDate {
		orderBy = `b.o_finishDate DESC`
	}

	query += ` ORDER BY ` + orderBy + ` LIMIT ? OFFSET ?`
	args = append(args, count, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var builds []*model.Build
	for rows.Next() {
		b, err := scanBuild(rows)
		if err != nil {
			return nil, err
		}
		builds = append(builds, b)
	}
	return builds, rows.Err()
}

func (s *DBStore) UpdateDescription(ctx context.Context, id int64, description string) error {
	if len(description) > model.BuildMaxDescriptionLen {
		return fmt.Errorf("description exceeds %d characters", model.BuildMaxDescriptionLen)
	}
	res, err := s.db.ExecContext(ctx, `UPDATE o_Build SET o_description = ? WHERE o_id = ?`, description, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_Build WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

func (s *DBStore) ListDependencies(ctx context.Context, buildID int64) ([]*model.BuildDependence, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_id, o_dependent_id, o_dependency_id, o_requireSuccessful, o_artifacts, o_destinationPath
		 FROM o_BuildDependence WHERE o_dependent_id = ? ORDER BY o_id`, buildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []*model.BuildDependence
	for rows.Next() {
		var d model.BuildDependence
		var requireSuccessful int
		var artifacts, destPath sql.NullString
		if err := rows.Scan(&d.ID, &d.DependentID, &d.DependencyID, &requireSuccessful, &artifacts, &destPath); err != nil {
			return nil, err
		}
		d.RequireSuccessful = requireSuccessful != 0
		if artifacts.Valid {
			d.Artifacts = artifacts.String
		}
		if destPath.Valid {
			d.DestinationPath = destPath.String
		}
		deps = append(deps, &d)
	}
	return deps, rows.Err()
}

func (s *DBStore) ListDependents(ctx context.Context, buildID int64) ([]*model.BuildDependence, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_id, o_dependent_id, o_dependency_id, o_requireSuccessful, o_artifacts, o_destinationPath
		 FROM o_BuildDependence WHERE o_dependency_id = ? ORDER BY o_id`, buildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deps []*model.BuildDependence
	for rows.Next() {
		var d model.BuildDependence
		var requireSuccessful int
		var artifacts, destPath sql.NullString
		if err := rows.Scan(&d.ID, &d.DependentID, &d.DependencyID, &requireSuccessful, &artifacts, &destPath); err != nil {
			return nil, err
		}
		d.RequireSuccessful = requireSuccessful != 0
		if artifacts.Valid {
			d.Artifacts = artifacts.String
		}
		if destPath.Valid {
			d.DestinationPath = destPath.String
		}
		deps = append(deps, &d)
	}
	return deps, rows.Err()
}

func (s *DBStore) ListLabels(ctx context.Context, buildID int64) ([]*model.BuildLabel, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_id, o_build_id, o_name FROM o_BuildLabel WHERE o_build_id = ? ORDER BY o_id`, buildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var labels []*model.BuildLabel
	for rows.Next() {
		var label model.BuildLabel
		if err := rows.Scan(&label.ID, &label.BuildID, &label.Name); err != nil {
			return nil, err
		}
		labels = append(labels, &label)
	}
	return labels, rows.Err()
}

func (s *DBStore) ListParams(ctx context.Context, buildID int64) ([]*model.BuildParam, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_id, o_build_id, o_name, o_type, o_value FROM o_BuildParam WHERE o_build_id = ? ORDER BY o_id`, buildID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var params []*model.BuildParam
	for rows.Next() {
		var param model.BuildParam
		if err := rows.Scan(&param.ID, &param.BuildID, &param.Name, &param.Type, &param.Value); err != nil {
			return nil, err
		}
		params = append(params, &param)
	}
	return params, rows.Err()
}

const buildSelectSQL = `
	SELECT b.o_id, b.o_project_id, b.o_numberScope_id, b.o_number, b.o_jobName, b.o_status,
		b.o_refName, b.o_commitHash, b.o_version, b.o_description,
		b.o_submitDate, b.o_pendingDate, b.o_runningDate, b.o_finishDate,
		b.o_submitReason, b.o_paused, b.o_uuid,
		p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_createDate,
		su.o_id, su.o_name, su.o_fullName, su.o_type, su.o_disabled,
		cu.o_id, cu.o_name, cu.o_fullName, cu.o_type, cu.o_disabled
	FROM o_Build b
	JOIN o_Project p ON p.o_id = b.o_project_id
	JOIN o_User su ON su.o_id = b.o_submitter_id
	LEFT JOIN o_User cu ON cu.o_id = b.o_canceller_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanBuild(row rowScanner) (*model.Build, error) {
	var b model.Build
	var status string
	var submitDate string
	var pendingDate, runningDate, finishDate sql.NullString
	var paused int
	var proj model.Project
	var projCreateDate string
	var submitter model.User
	var submitterType string
	var submitterDisabled int
	var cancellerID sql.NullInt64
	var cancellerName, cancellerFullName, cancellerType sql.NullString
	var cancellerDisabled sql.NullInt64
	var submitSequence int64
	var retryDate sql.NullString
	var token, workDirPath, checkoutPathsJSON string

	err := row.Scan(
		&b.ID, &b.ProjectID, &b.NumberScopeID, &b.Number, &b.JobName, &status,
		&b.RefName, &b.CommitHash, &b.Version, &b.Description,
		&submitDate, &pendingDate, &runningDate, &finishDate,
		&b.SubmitReason, &paused, &b.UUID,
		&proj.ID, &proj.Name, &proj.Path, &proj.PathLen, &proj.Key, &proj.Description, &projCreateDate,
		&submitter.ID, &submitter.Name, &submitter.FullName, &submitterType, &submitterDisabled,
		&cancellerID, &cancellerName, &cancellerFullName, &cancellerType, &cancellerDisabled,
	)
	if err != nil {
		return nil, err
	}

	b.Status = model.BuildStatus(status)
	b.Paused = paused != 0
	b.SubmitSequence = submitSequence
	b.Token = token
	b.WorkDirPath = workDirPath
	if checkoutPathsJSON != "" && checkoutPathsJSON != "[]" {
		_ = json.Unmarshal([]byte(checkoutPathsJSON), &b.CheckoutPaths)
	}
	if retryDate.Valid && retryDate.String != "" {
		t, err := time.Parse(time.RFC3339Nano, retryDate.String)
		if err == nil {
			b.RetryDate = &t
		}
	}
	b.SubmitDate, _ = time.Parse(time.RFC3339Nano, submitDate)
	b.PendingDate = parseOptionalTime(pendingDate)
	b.RunningDate = parseOptionalTime(runningDate)
	b.FinishDate = parseOptionalTime(finishDate)
	b.PendingDuration = durationMillis(b.SubmitDate, b.PendingDate)
	if b.RunningDate != nil {
		start := b.SubmitDate
		if b.PendingDate != nil {
			start = *b.PendingDate
		}
		b.RunningDuration = durationMillis(start, b.RunningDate)
	}
	proj.CreateDate, _ = time.Parse(time.RFC3339Nano, projCreateDate)
	b.Project = &proj
	submitter.Type = model.UserType(submitterType)
	submitter.Disabled = submitterDisabled != 0
	b.Submitter = &submitter
	if cancellerID.Valid {
		canceller := &model.User{
			ID:       cancellerID.Int64,
			Name:     cancellerName.String,
			FullName: cancellerFullName.String,
			Type:     model.UserType(cancellerType.String),
			Disabled: cancellerDisabled.Int64 != 0,
		}
		b.Canceller = canceller
	}
	return &b, nil
}

func durationMillis(from time.Time, to *time.Time) int64 {
	if to == nil || to.IsZero() {
		return 0
	}
	ms := to.Sub(from).Milliseconds()
	if ms < 0 {
		return 0
	}
	return ms
}

func parseOptionalTime(v sql.NullString) *time.Time {
	if !v.Valid || v.String == "" {
		return nil
	}
	t, err := time.Parse(time.RFC3339Nano, v.String)
	if err != nil {
		return nil
	}
	return &t
}

func formatOptionalTime(t *time.Time) any {
	if t == nil || t.IsZero() {
		return nil
	}
	return t.Format(time.RFC3339Nano)
}

func optionalUserID(u *model.User) any {
	if u == nil || u.ID == 0 {
		return nil
	}
	return u.ID
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

// UpdateStatus updates the status of a build.
func (s *DBStore) UpdateStatus(ctx context.Context, id int64, status model.BuildStatus) error {
	res, err := s.db.ExecContext(ctx,
		`UPDATE o_Build SET o_status = ? WHERE o_id = ?`, string(status), id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// UpdateVersion sets the build version string (SetBuildVersionStep).
func (s *DBStore) UpdateVersion(ctx context.Context, id int64, version string) error {
	res, err := s.db.ExecContext(ctx, `UPDATE o_Build SET o_version = ? WHERE o_id = ?`, version, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// ResetForResubmit resets a finished build for resubmission (OneDev resubmit semantics).
func (s *DBStore) ResetForResubmit(ctx context.Context, id int64, token, reason string, submitterID int64) error {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_Build SET
			o_status = ?, o_token = ?, o_finishDate = NULL, o_pendingDate = NULL,
			o_runningDate = NULL, o_retryDate = NULL, o_submitDate = ?,
			o_submitReason = ?, o_submitter_id = ?,
			o_submitSequence = o_submitSequence + 1, o_checkoutPaths = '[]'
		WHERE o_id = ? AND o_status IN ('SUCCESSFUL', 'FAILED', 'CANCELLED', 'TIMED_OUT')`,
		string(model.BuildStatusWaiting), token, now, reason, submitterID, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// UpdateRetryPending resets a build to PENDING for retry with cleared running state.
func (s *DBStore) UpdateRetryPending(ctx context.Context, id int64) error {
	now := time.Now().UTC().Format(time.RFC3339Nano)
	_, err := s.db.ExecContext(ctx, `
		UPDATE o_Build SET o_status = ?, o_runningDate = NULL, o_pendingDate = ?,
			o_retryDate = ?, o_checkoutPaths = '[]'
		WHERE o_id = ?`,
		string(model.BuildStatusPending), now, now, id)
	return err
}

// UpdateDates updates the pending, running, and/or finish dates of a build.
// Nil values are not updated (leave the existing value).
func (s *DBStore) UpdateDates(ctx context.Context, id int64, pendingDate, runningDate, finishDate *time.Time) error {
	if pendingDate != nil {
		_, err := s.db.ExecContext(ctx,
			`UPDATE o_Build SET o_pendingDate = ? WHERE o_id = ?`,
			pendingDate.Format(time.RFC3339Nano), id)
		if err != nil {
			return err
		}
	}
	if runningDate != nil {
		_, err := s.db.ExecContext(ctx,
			`UPDATE o_Build SET o_runningDate = ? WHERE o_id = ?`,
			runningDate.Format(time.RFC3339Nano), id)
		if err != nil {
			return err
		}
	}
	if finishDate != nil {
		_, err := s.db.ExecContext(ctx,
			`UPDATE o_Build SET o_finishDate = ? WHERE o_id = ?`,
			finishDate.Format(time.RFC3339Nano), id)
		if err != nil {
			return err
		}
	}
	return nil
}

// CreateDependence creates a build dependency record.
func (s *DBStore) CreateDependence(ctx context.Context, dep *model.BuildDependence) error {
	if dep == nil {
		return errors.New("dependence is nil")
	}
	var requireSuccessful int
	if dep.RequireSuccessful {
		requireSuccessful = 1
	}
	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_BuildDependence (o_dependent_id, o_dependency_id, o_requireSuccessful, o_artifacts, o_destinationPath)
		VALUES (?, ?, ?, ?, ?)`,
		dep.DependentID, dep.DependencyID, requireSuccessful,
		nullString(dep.Artifacts), nullString(dep.DestinationPath))
	if err != nil {
		return err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return err
	}
	dep.ID = id
	return nil
}

func nullString(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}
