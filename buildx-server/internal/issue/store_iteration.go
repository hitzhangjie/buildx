package issue

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var ErrIterationNotFound = errors.New("iteration not found")

func (s *DBStore) CreateIteration(ctx context.Context, iter *model.Iteration) (*model.Iteration, error) {
	if iter == nil {
		return nil, errors.New("iteration is nil")
	}
	name := strings.TrimSpace(iter.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}
	if iter.ProjectID == 0 {
		return nil, errors.New("projectId is required")
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_Iteration (o_project_id, o_name, o_description, o_startDay, o_dueDay, o_closed)
		VALUES (?, ?, ?, ?, ?, ?)`,
		iter.ProjectID,
		name,
		iter.Description,
		nullableInt64(iter.StartDay),
		nullableInt64(iter.DueDay),
		boolToInt(iter.Closed),
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	iter.ID = id
	iter.Name = name
	return s.GetIteration(ctx, id)
}

func (s *DBStore) GetIteration(ctx context.Context, id int64) (*model.Iteration, error) {
	row := s.db.QueryRowContext(ctx, iterationSelectSQL+` WHERE i.o_id = ? GROUP BY i.o_id`, id)
	iter, err := scanIteration(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrIterationNotFound
	}
	return iter, err
}

func (s *DBStore) ListIterations(ctx context.Context, projectID int64, name string, closed *bool, offset, count int) ([]*model.Iteration, error) {
	if count <= 0 {
		count = 100
	}
	if count > 500 {
		count = 500
	}
	if offset < 0 {
		offset = 0
	}

	query := iterationSelectSQL + ` WHERE i.o_project_id = ?`
	args := []any{projectID}

	if name != "" {
		query += ` AND LOWER(i.o_name) LIKE ?`
		args = append(args, "%"+strings.ToLower(strings.ReplaceAll(name, "%", ""))+"%")
	}
	if closed != nil {
		query += ` AND i.o_closed = ?`
		args = append(args, boolToInt(*closed))
	}
	query += ` GROUP BY i.o_id ORDER BY i.o_dueDay IS NULL, i.o_dueDay ASC, i.o_name ASC LIMIT ? OFFSET ?`
	args = append(args, count, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
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

func (s *DBStore) UpdateIteration(ctx context.Context, iter *model.Iteration) (*model.Iteration, error) {
	if iter == nil || iter.ID == 0 {
		return nil, errors.New("iteration id is required")
	}
	name := strings.TrimSpace(iter.Name)
	if name == "" {
		return nil, errors.New("name is required")
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_Iteration SET o_name = ?, o_description = ?, o_startDay = ?, o_dueDay = ?, o_closed = ?
		WHERE o_id = ?`,
		name,
		iter.Description,
		nullableInt64(iter.StartDay),
		nullableInt64(iter.DueDay),
		boolToInt(iter.Closed),
		iter.ID,
	)
	if err != nil {
		return nil, err
	}
	if err := affectedOne(res, ErrIterationNotFound); err != nil {
		return nil, err
	}
	return s.GetIteration(ctx, iter.ID)
}

func (s *DBStore) DeleteIteration(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_Iteration WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrIterationNotFound)
}

const iterationSelectSQL = `
	SELECT i.o_id, i.o_project_id, i.o_name, i.o_description, i.o_startDay, i.o_dueDay, i.o_closed,
		p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_createDate,
		COUNT(s.o_id) AS schedule_count
	FROM o_Iteration i
	JOIN o_Project p ON p.o_id = i.o_project_id
	LEFT JOIN o_IssueSchedule s ON s.o_iteration_id = i.o_id`

func scanIteration(row rowScanner) (*model.Iteration, error) {
	var iter model.Iteration
	var startDay, dueDay sql.NullInt64
	var closed int
	var proj model.Project
	var createDate string

	err := row.Scan(
		&iter.ID, &iter.ProjectID, &iter.Name, &iter.Description, &startDay, &dueDay, &closed,
		&proj.ID, &proj.Name, &proj.Path, &proj.PathLen, &proj.Key, &proj.Description, &createDate,
		&iter.ScheduleCount,
	)
	if err != nil {
		return nil, err
	}
	if startDay.Valid {
		v := startDay.Int64
		iter.StartDay = &v
	}
	if dueDay.Valid {
		v := dueDay.Int64
		iter.DueDay = &v
	}
	iter.Closed = closed != 0
	proj.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	iter.Project = &proj
	return &iter, nil
}

func nullableInt64(v *int64) any {
	if v == nil {
		return nil
	}
	return *v
}
