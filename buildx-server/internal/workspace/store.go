package workspace

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var ErrNotFound = errors.New("workspace not found")

// DBStore implements workspace persistence in SQLite.
type DBStore struct {
	db *sql.DB
}

func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

// Create creates a new workspace with an auto-incremented number per project.
func (s *DBStore) Create(ctx context.Context, ws *model.Workspace) (*model.Workspace, error) {
	if ws == nil {
		return nil, errors.New("workspace is nil")
	}
	if ws.ProjectID == 0 {
		return nil, errors.New("projectId is required")
	}
	if ws.SpecName == "" {
		return nil, errors.New("specName is required")
	}
	if ws.CommitHash == "" {
		return nil, errors.New("commitHash is required")
	}
	if ws.UserID == 0 {
		return nil, errors.New("userId is required")
	}
	if ws.NumberScopeID == 0 {
		ws.NumberScopeID = ws.ProjectID
	}
	if ws.Status == "" {
		ws.Status = model.WorkspaceStatusPending
	}
	if ws.CreateDate.IsZero() {
		ws.CreateDate = time.Now().UTC()
	}
	if ws.Token == "" {
		ws.Token = generateToken()
	}

	number, err := s.nextNumber(ctx, ws.NumberScopeID)
	if err != nil {
		return nil, err
	}
	ws.Number = number

	activeDate := nullableTime(ws.ActiveDate)
	inactiveDate := nullableTime(ws.InactiveDate)
	agentID := nullableInt64(ws.AgentID)

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_Workspace (
			o_numberScope_id, o_number, o_user_id, o_project_id,
			o_specName, o_branch, o_commitHash, o_status,
			o_createDate, o_activeDate, o_inactiveDate,
			o_provisionerName, o_serverAddress, o_agent_id, o_token
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		ws.NumberScopeID, ws.Number, ws.UserID, ws.ProjectID,
		ws.SpecName, nullIfEmpty(ws.Branch), ws.CommitHash, string(ws.Status),
		ws.CreateDate.Format(time.RFC3339Nano), activeDate, inactiveDate,
		nullIfEmpty(ws.ProvisionerName), nullIfEmpty(ws.ServerAddress), agentID, ws.Token,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	ws.ID = id
	return s.Get(ctx, id)
}

func (s *DBStore) nextNumber(ctx context.Context, scopeID int64) (int64, error) {
	var max sql.NullInt64
	err := s.db.QueryRowContext(ctx,
		`SELECT MAX(o_number) FROM o_Workspace WHERE o_numberScope_id = ?`, scopeID).Scan(&max)
	if err != nil {
		return 0, err
	}
	if !max.Valid {
		return 1, nil
	}
	return max.Int64 + 1, nil
}

// Get returns a workspace by its internal ID.
func (s *DBStore) Get(ctx context.Context, id int64) (*model.Workspace, error) {
	row := s.db.QueryRowContext(ctx, workspaceSelectSQL+` WHERE w.o_id = ?`, id)
	ws, err := scanWorkspace(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ws, err
}

// GetByNumber returns a workspace by project and workspace number.
func (s *DBStore) GetByNumber(ctx context.Context, projectID int64, number int64) (*model.Workspace, error) {
	row := s.db.QueryRowContext(ctx, workspaceSelectSQL+` WHERE w.o_project_id = ? AND w.o_number = ?`, projectID, number)
	ws, err := scanWorkspace(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	return ws, err
}

// QueryOptions holds filtering criteria for workspace queries.
type QueryOptions struct {
	ProjectID int64
	Status    string // single status filter
	SpecName  string
	Branch    string
	UserID    int64
	Query     string // free-text search (fuzzy)
	Offset    int
	Count     int
}

// Query returns workspaces matching the given options.
func (s *DBStore) Query(ctx context.Context, opts QueryOptions) ([]*model.Workspace, int64, error) {
	if opts.Count <= 0 {
		opts.Count = 100
	}
	if opts.Count > 500 {
		opts.Count = 500
	}
	if opts.Offset < 0 {
		opts.Offset = 0
	}

	var conditions []string
	var args []any

	if opts.ProjectID != 0 {
		conditions = append(conditions, "w.o_project_id = ?")
		args = append(args, opts.ProjectID)
	}
	if opts.Status != "" {
		conditions = append(conditions, "w.o_status = ?")
		args = append(args, opts.Status)
	}
	if opts.SpecName != "" {
		conditions = append(conditions, "w.o_specName = ?")
		args = append(args, opts.SpecName)
	}
	if opts.Branch != "" {
		conditions = append(conditions, "w.o_branch = ?")
		args = append(args, opts.Branch)
	}
	if opts.UserID != 0 {
		conditions = append(conditions, "w.o_user_id = ?")
		args = append(args, opts.UserID)
	}
	if opts.Query != "" {
		conditions = append(conditions, "(LOWER(w.o_specName) LIKE ? OR LOWER(w.o_branch) LIKE ?)")
		q := "%" + strings.ToLower(opts.Query) + "%"
		args = append(args, q, q)
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = " WHERE " + strings.Join(conditions, " AND ")
	}

	// Count total
	var total int64
	countQuery := "SELECT COUNT(*) FROM o_Workspace w" + whereClause
	if err := s.db.QueryRowContext(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Query with pagination
	query := workspaceSelectSQL + whereClause + " ORDER BY w.o_createDate DESC LIMIT ? OFFSET ?"
	queryArgs := append(args, opts.Count, opts.Offset)
	rows, err := s.db.QueryContext(ctx, query, queryArgs...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var workspaces []*model.Workspace
	for rows.Next() {
		ws, err := scanWorkspace(rows)
		if err != nil {
			return nil, 0, err
		}
		workspaces = append(workspaces, ws)
	}
	return workspaces, total, rows.Err()
}

// UpdateStatus updates only the status (and timestamps) of a workspace.
func (s *DBStore) UpdateStatus(ctx context.Context, id int64, status model.WorkspaceStatus) error {
	now := time.Now().UTC()
	var activeDate, inactiveDate *string
	if status == model.WorkspaceStatusActive {
		activeDate = strPtr(now.Format(time.RFC3339Nano))
	}
	if status == model.WorkspaceStatusInactive {
		inactiveDate = strPtr(now.Format(time.RFC3339Nano))
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_Workspace SET o_status = ?, o_activeDate = COALESCE(?, o_activeDate), o_inactiveDate = COALESCE(?, o_inactiveDate)
		WHERE o_id = ?`, string(status), activeDate, inactiveDate, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// Delete removes a workspace by ID.
func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_Workspace WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// CountByProject returns workspace counts grouped by status for a project.
func (s *DBStore) CountByProject(ctx context.Context, projectID int64) (pending, active, inactive int64, err error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_status, COUNT(*) FROM o_Workspace WHERE o_project_id = ? GROUP BY o_status`, projectID)
	if err != nil {
		return 0, 0, 0, err
	}
	defer rows.Close()

	for rows.Next() {
		var status string
		var count int64
		if err := rows.Scan(&status, &count); err != nil {
			return 0, 0, 0, err
		}
		switch status {
		case "PENDING":
			pending = count
		case "ACTIVE":
			active = count
		case "INACTIVE":
			inactive = count
		}
	}
	return pending, active, inactive, rows.Err()
}

// CountByProjectTotal returns total workspace count for a project.
func (s *DBStore) CountByProjectTotal(ctx context.Context, projectID int64) (int64, error) {
	var count int64
	err := s.db.QueryRowContext(ctx,
		`SELECT COUNT(*) FROM o_Workspace WHERE o_project_id = ?`, projectID).Scan(&count)
	return count, err
}

const workspaceSelectSQL = `
	SELECT w.o_id, w.o_numberScope_id, w.o_number, w.o_user_id, w.o_project_id,
		w.o_specName, w.o_branch, w.o_commitHash, w.o_status,
		w.o_createDate, w.o_activeDate, w.o_inactiveDate,
		w.o_provisionerName, w.o_serverAddress, w.o_agent_id,
		u.o_id, u.o_name, u.o_fullName, u.o_type, u.o_disabled,
		p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_createDate
	FROM o_Workspace w
	JOIN o_User u ON u.o_id = w.o_user_id
	JOIN o_Project p ON p.o_id = w.o_project_id`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanWorkspace(row rowScanner) (*model.Workspace, error) {
	var ws model.Workspace
	var createDate, projectCreateDate string
	var activeDate, inactiveDate sql.NullString
	var agentID sql.NullInt64
	var user model.User
	var userType string
	var disabled int
	var proj model.Project
	var branch sql.NullString
	var provisionerName, serverAddress sql.NullString

	err := row.Scan(
		&ws.ID, &ws.NumberScopeID, &ws.Number, &ws.UserID, &ws.ProjectID,
		&ws.SpecName, &branch, &ws.CommitHash, &ws.Status,
		&createDate, &activeDate, &inactiveDate,
		&provisionerName, &serverAddress, &agentID,
		&user.ID, &user.Name, &user.FullName, &userType, &disabled,
		&proj.ID, &proj.Name, &proj.Path, &proj.PathLen, &proj.Key, &proj.Description, &projectCreateDate,
	)
	if err != nil {
		return nil, err
	}

	ws.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	if activeDate.Valid {
		t, _ := time.Parse(time.RFC3339Nano, activeDate.String)
		ws.ActiveDate = &t
	}
	if inactiveDate.Valid {
		t, _ := time.Parse(time.RFC3339Nano, inactiveDate.String)
		ws.InactiveDate = &t
	}
	if branch.Valid {
		ws.Branch = branch.String
	}
	if provisionerName.Valid {
		ws.ProvisionerName = provisionerName.String
	}
	if serverAddress.Valid {
		ws.ServerAddress = serverAddress.String
	}
	if agentID.Valid {
		ws.AgentID = &agentID.Int64
	}

	user.Type = model.UserType(userType)
	user.Disabled = disabled != 0
	ws.User = &user

	proj.CreateDate, _ = time.Parse(time.RFC3339Nano, projectCreateDate)
	ws.Project = &proj

	return &ws, nil
}

// --- helpers ---

func generateToken() string {
	b := make([]byte, 32)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
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

func nullIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

func nullableTime(t *time.Time) interface{} {
	if t == nil {
		return nil
	}
	return t.Format(time.RFC3339Nano)
}

func nullableInt64(v *int64) interface{} {
	if v == nil {
		return nil
	}
	return *v
}

func strPtr(s string) *string {
	return &s
}
