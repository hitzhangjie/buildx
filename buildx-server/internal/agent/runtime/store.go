// Package runtime provides CI Agent lifecycle management, persistence, and
// communication (WebSocket) for BuildX build/workspace agents.
//
// Maps to OneDev's io.onedev.server.agent and related agent management services.
package runtime

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var (
	ErrNotFound     = errors.New("agent not found")
	ErrTokenInvalid = errors.New("agent token is invalid or expired")
)

// DBStore implements agent lifecycle persistence against SQLite.
type DBStore struct {
	db *sql.DB
}

// NewDBStore creates a new DBStore backed by the given SQLite database handle.
func NewDBStore(db *sql.DB) *DBStore {
	return &DBStore{db: db}
}

// Create inserts a new agent record and returns it with the generated ID.
func (s *DBStore) Create(ctx context.Context, a *model.Agent) (*model.Agent, error) {
	if a == nil {
		return nil, errors.New("agent is nil")
	}
	if a.Name == "" {
		return nil, errors.New("agent name is required")
	}

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_Agent (
			o_name, o_token, o_os, o_arch, o_version, o_osVersion, o_ipAddress,
			o_cpuCount, o_paused, o_online, o_cpuLoad,
			o_memTotal, o_memFree, o_diskTotal, o_diskFree,
			o_lastActiveDate, o_agentVersion
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		a.Name, a.Token, a.OS, a.Arch, a.Version, a.OSVersion, a.IPAddress,
		a.CPUCount, boolToInt(a.Paused), boolToInt(a.Online), a.CpuLoad,
		a.MemTotal, a.MemFree, a.DiskTotal, a.DiskFree,
		formatOptionalTime(a.LastActiveDate), a.AgentVersion,
	)
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	a.ID = id
	return s.Get(ctx, id)
}

// Get retrieves an agent by its ID.
func (s *DBStore) Get(ctx context.Context, id int64) (*model.Agent, error) {
	row := s.db.QueryRowContext(ctx, agentSelectSQL+` WHERE a.o_id = ?`, id)
	agent, err := scanAgent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	// Load attributes
	attrs, err := s.GetAttributes(ctx, id)
	if err == nil {
		agent.Attributes = attrs
	}
	return agent, nil
}

// GetByName retrieves an agent by its name.
func (s *DBStore) GetByName(ctx context.Context, name string) (*model.Agent, error) {
	row := s.db.QueryRowContext(ctx, agentSelectSQL+` WHERE a.o_name = ?`, name)
	agent, err := scanAgent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	attrs, err := s.GetAttributes(ctx, agent.ID)
	if err == nil {
		agent.Attributes = attrs
	}
	return agent, nil
}

// GetByToken retrieves an agent by its authentication token.
func (s *DBStore) GetByToken(ctx context.Context, token string) (*model.Agent, error) {
	row := s.db.QueryRowContext(ctx, agentSelectSQL+` WHERE a.o_token = ?`, token)
	agent, err := scanAgent(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	attrs, err := s.GetAttributes(ctx, agent.ID)
	if err == nil {
		agent.Attributes = attrs
	}
	return agent, nil
}

// List returns all agents.
func (s *DBStore) List(ctx context.Context) ([]*model.Agent, error) {
	return s.Query(ctx, AgentQueryFilter{}, 0, 0)
}

// Query returns agents matching the given filter, with pagination.
// If offset < 0 it defaults to 0. If count <= 0 it defaults to 100.
func (s *DBStore) Query(ctx context.Context, filter AgentQueryFilter, offset, count int) ([]*model.Agent, error) {
	if count <= 0 {
		count = 100
	}
	if count > 100 {
		count = 100
	}
	if offset < 0 {
		offset = 0
	}

	var where []string
	var args []any

	if filter.Name != "" {
		where = append(where, `a.o_name = ?`)
		args = append(args, filter.Name)
	}
	if filter.Status == "online" {
		where = append(where, `a.o_online = 1`)
	} else if filter.Status == "offline" {
		where = append(where, `a.o_online = 0 AND a.o_paused = 0`)
	} else if filter.Status == "paused" {
		where = append(where, `a.o_paused = 1`)
	}
	if filter.OS != "" {
		where = append(where, `a.o_os = ?`)
		args = append(args, filter.OS)
	}
	if filter.OSArch != "" {
		where = append(where, `a.o_arch = ?`)
		args = append(args, filter.OSArch)
	}
	if filter.IPAddress != "" {
		where = append(where, `a.o_ipAddress = ?`)
		args = append(args, filter.IPAddress)
	}
	if filter.FreeText != "" {
		pat := "%" + strings.ToLower(filter.FreeText) + "%"
		where = append(where, `(LOWER(a.o_name) LIKE ? OR LOWER(a.o_os) LIKE ? OR LOWER(a.o_osVersion) LIKE ?)`)
		args = append(args, pat, pat, pat)
	}

	query := agentSelectSQL
	if len(where) > 0 {
		query += ` WHERE ` + strings.Join(where, ` AND `)
	}
	query += ` ORDER BY a.o_name LIMIT ? OFFSET ?`
	args = append(args, count, offset)

	rows, err := s.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agents []*model.Agent
	for rows.Next() {
		a, err := scanAgentRows(rows)
		if err != nil {
			return nil, err
		}
		if a != nil {
			attrs, err := s.GetAttributes(ctx, a.ID)
			if err == nil {
				a.Attributes = attrs
			}
			agents = append(agents, a)
		}
	}
	if agents == nil {
		agents = []*model.Agent{}
	}
	return agents, rows.Err()
}

// Update persists changes to an agent's mutable fields (name, token, os, arch, etc.).
func (s *DBStore) Update(ctx context.Context, a *model.Agent) error {
	if a == nil || a.ID == 0 {
		return errors.New("agent ID is required for update")
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_Agent SET
			o_name = ?, o_token = ?, o_os = ?, o_arch = ?, o_version = ?,
			o_osVersion = ?, o_ipAddress = ?, o_cpuCount = ?,
			o_paused = ?, o_online = ?, o_cpuLoad = ?,
			o_memTotal = ?, o_memFree = ?, o_diskTotal = ?, o_diskFree = ?,
			o_lastActiveDate = ?, o_agentVersion = ?
		WHERE o_id = ?`,
		a.Name, a.Token, a.OS, a.Arch, a.Version,
		a.OSVersion, a.IPAddress, a.CPUCount,
		boolToInt(a.Paused), boolToInt(a.Online), a.CpuLoad,
		a.MemTotal, a.MemFree, a.DiskTotal, a.DiskFree,
		formatOptionalTime(a.LastActiveDate), a.AgentVersion,
		a.ID,
	)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// UpdateStatus updates only the agent's live status fields (online, cpuLoad, memFree, diskFree).
func (s *DBStore) UpdateStatus(ctx context.Context, id int64, online bool, data *model.AgentData) error {
	now := time.Now().UTC()
	var cpuLoad, memFree, diskFree float64
	if data != nil {
		cpuLoad = data.CpuLoad
		memFree = float64(data.MemFree)
		diskFree = float64(data.DiskFree)
	}
	res, err := s.db.ExecContext(ctx, `
		UPDATE o_Agent SET
			o_online = ?, o_cpuLoad = ?, o_memFree = ?, o_diskFree = ?,
			o_lastActiveDate = ?, o_ipAddress = ?
		WHERE o_id = ?`,
		boolToInt(online), cpuLoad, int64(memFree), int64(diskFree),
		now.Format(time.RFC3339Nano), "",
		id,
	)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// Delete removes an agent and its associated attributes and tokens (via CASCADE).
func (s *DBStore) Delete(ctx context.Context, id int64) error {
	res, err := s.db.ExecContext(ctx, `DELETE FROM o_Agent WHERE o_id = ?`, id)
	if err != nil {
		return err
	}
	return affectedOne(res, ErrNotFound)
}

// CreateToken generates and persists a new authentication token for the given agent.
func (s *DBStore) CreateToken(ctx context.Context, agentID int64) (*model.AgentToken, error) {
	if agentID == 0 {
		return nil, errors.New("agent ID is required")
	}
	token := uuid.NewString()
	now := time.Now().UTC()

	res, err := s.db.ExecContext(ctx, `
		INSERT INTO o_AgentToken (o_agent_id, o_token, o_createDate)
		VALUES (?, ?, ?)`,
		agentID, token, now.Format(time.RFC3339Nano))
	if err != nil {
		return nil, err
	}
	id, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}
	return &model.AgentToken{
		ID:         id,
		AgentID:    agentID,
		Token:      token,
		CreateDate: now,
	}, nil
}

// GetToken retrieves the agent token for the given agent ID.
func (s *DBStore) GetToken(ctx context.Context, agentID int64) (*model.AgentToken, error) {
	row := s.db.QueryRowContext(ctx,
		`SELECT o_id, o_agent_id, o_token, o_createDate FROM o_AgentToken WHERE o_agent_id = ?`, agentID)
	var t model.AgentToken
	var createDate string
	if err := row.Scan(&t.ID, &t.AgentID, &t.Token, &createDate); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	t.CreateDate, _ = time.Parse(time.RFC3339Nano, createDate)
	return &t, nil
}

// SetAttributes replaces all attributes for an agent with the given map.
func (s *DBStore) SetAttributes(ctx context.Context, agentID int64, attrs map[string]string) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.ExecContext(ctx, `DELETE FROM o_AgentAttribute WHERE o_agent_id = ?`, agentID); err != nil {
		return err
	}
	for k, v := range attrs {
		if _, err := tx.ExecContext(ctx, `
			INSERT INTO o_AgentAttribute (o_agent_id, o_name, o_value) VALUES (?, ?, ?)`,
			agentID, k, v); err != nil {
			return err
		}
	}
	return tx.Commit()
}

// GetAttributes returns all attributes for an agent as a map.
func (s *DBStore) GetAttributes(ctx context.Context, agentID int64) (map[string]string, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT o_name, o_value FROM o_AgentAttribute WHERE o_agent_id = ?`, agentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	attrs := make(map[string]string)
	for rows.Next() {
		var k, v string
		if err := rows.Scan(&k, &v); err != nil {
			return nil, err
		}
		attrs[k] = v
	}
	if len(attrs) == 0 {
		return nil, nil
	}
	return attrs, rows.Err()
}

// ListOnline returns all agents currently marked as online.
func (s *DBStore) ListOnline(ctx context.Context) ([]*model.Agent, error) {
	rows, err := s.db.QueryContext(ctx, agentSelectSQL+` WHERE a.o_online = 1 ORDER BY a.o_name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var agents []*model.Agent
	for rows.Next() {
		a, err := scanAgentRows(rows)
		if err != nil {
			return nil, err
		}
		if a != nil {
			agents = append(agents, a)
		}
	}
	if agents == nil {
		agents = []*model.Agent{}
	}
	return agents, rows.Err()
}

// GetOSNames returns distinct OS names known by registered agents.
func (s *DBStore) GetOSNames(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT DISTINCT o_os FROM o_Agent WHERE o_os != '' ORDER BY o_os`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var names []string
	for rows.Next() {
		var n string
		if err := rows.Scan(&n); err != nil {
			return nil, err
		}
		names = append(names, n)
	}
	return names, nil
}

// GetOSArchs returns distinct OS architectures known by registered agents.
func (s *DBStore) GetOSArchs(ctx context.Context) ([]string, error) {
	rows, err := s.db.QueryContext(ctx,
		`SELECT DISTINCT o_arch FROM o_Agent WHERE o_arch != '' ORDER BY o_arch`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var archs []string
	for rows.Next() {
		var a string
		if err := rows.Scan(&a); err != nil {
			return nil, err
		}
		archs = append(archs, a)
	}
	return archs, nil
}

// --- internal helpers ---

const agentSelectSQL = `
	SELECT a.o_id, a.o_name, a.o_token, a.o_os, a.o_arch, a.o_version,
		a.o_osVersion, a.o_ipAddress, a.o_cpuCount,
		a.o_paused, a.o_online, a.o_cpuLoad,
		a.o_memTotal, a.o_memFree, a.o_diskTotal, a.o_diskFree,
		a.o_lastActiveDate, a.o_agentVersion
	FROM o_Agent a`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanAgent(row rowScanner) (*model.Agent, error) {
	var a model.Agent
	var paused, online int
	var lastActiveDate sql.NullString

	err := row.Scan(
		&a.ID, &a.Name, &a.Token, &a.OS, &a.Arch, &a.Version,
		&a.OSVersion, &a.IPAddress, &a.CPUCount,
		&paused, &online, &a.CpuLoad,
		&a.MemTotal, &a.MemFree, &a.DiskTotal, &a.DiskFree,
		&lastActiveDate, &a.AgentVersion,
	)
	if err != nil {
		return nil, err
	}
	a.Paused = paused != 0
	a.Online = online != 0
	if lastActiveDate.Valid && lastActiveDate.String != "" {
		t, err := time.Parse(time.RFC3339Nano, lastActiveDate.String)
		if err == nil {
			a.LastActiveDate = &t
		}
	}
	return &a, nil
}

func scanAgentRows(rows rowScanner) (*model.Agent, error) {
	return scanAgent(rows)
}

func boolToInt(v bool) int {
	if v {
		return 1
	}
	return 0
}

func formatOptionalTime(t *time.Time) any {
	if t == nil || t.IsZero() {
		return nil
	}
	return t.Format(time.RFC3339Nano)
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
