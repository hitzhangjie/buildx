package issue

import (
	"context"
	"database/sql"
	"errors"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var ErrIterationNotInProject = errors.New("iteration does not belong to issue project")

// SetIssueIterations replaces scheduled iterations for an issue.
func (s *DBStore) SetIssueIterations(ctx context.Context, issueID int64, iterationIDs []int64) error {
	issue, err := s.Get(ctx, issueID)
	if err != nil {
		return err
	}

	for _, iterID := range iterationIDs {
		iter, err := s.GetIteration(ctx, iterID)
		if err != nil {
			return err
		}
		if iter.ProjectID != issue.ProjectID {
			return ErrIterationNotInProject
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, `DELETE FROM o_IssueSchedule WHERE o_issue_id = ?`, issueID); err != nil {
		return err
	}
	for _, iterID := range iterationIDs {
		if _, err := tx.ExecContext(ctx,
			`INSERT INTO o_IssueSchedule (o_issue_id, o_iteration_id) VALUES (?, ?)`,
			issueID, iterID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// ListIssueIterations returns iterations scheduled for an issue.
func (s *DBStore) ListIssueIterations(ctx context.Context, issueID int64) ([]*model.Iteration, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT i.o_id, i.o_project_id, i.o_name, i.o_description, i.o_startDay, i.o_dueDay, i.o_closed,
			p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_createDate,
			0 AS schedule_count
		FROM o_Iteration i
		JOIN o_Project p ON p.o_id = i.o_project_id
		JOIN o_IssueSchedule s ON s.o_iteration_id = i.o_id
		WHERE s.o_issue_id = ?
		ORDER BY i.o_dueDay IS NULL, i.o_dueDay ASC, i.o_name ASC`, issueID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var iters []*model.Iteration
	for rows.Next() {
		iter, err := scanIteration(rows)
		if err != nil {
			return nil, err
		}
		iters = append(iters, iter)
	}
	return iters, rows.Err()
}

// ListIssuesByIteration returns issues scheduled into an iteration.
func (s *DBStore) ListIssuesByIteration(ctx context.Context, iterationID int64) ([]*model.Issue, error) {
	rows, err := s.db.QueryContext(ctx, issueSelectSQL+`
		JOIN o_IssueSchedule sch ON sch.o_issue_id = i.o_id
		WHERE sch.o_iteration_id = ?
		ORDER BY i.o_number`, iterationID)
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

// CountIssuesByIterationState returns issue counts grouped by state for burndown summary.
func (s *DBStore) CountIssuesByIterationState(ctx context.Context, iterationID int64) (map[string]int, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT i.o_state, COUNT(*)
		FROM o_Issue i
		JOIN o_IssueSchedule s ON s.o_issue_id = i.o_id
		WHERE s.o_iteration_id = ?
		GROUP BY i.o_state`, iterationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	stats := map[string]int{}
	for rows.Next() {
		var state string
		var count int
		if err := rows.Scan(&state, &count); err != nil {
			return nil, err
		}
		stats[state] = count
	}
	return stats, rows.Err()
}

// IterationExists checks iteration id exists (helper for tests).
func (s *DBStore) IterationExists(ctx context.Context, id int64) (bool, error) {
	var n int
	err := s.db.QueryRowContext(ctx, `SELECT COUNT(*) FROM o_Iteration WHERE o_id = ?`, id).Scan(&n)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	return n > 0, err
}
