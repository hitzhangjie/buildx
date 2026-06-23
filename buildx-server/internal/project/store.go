package project

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var (
	ErrNotFound      = errors.New("project not found")
	ErrAlreadyExists = errors.New("project already exists")
	ErrInvalidName   = errors.New("invalid project name")
)

var projectKeyPattern = regexp.MustCompile(`^[A-Z][A-Z0-9]*$`)

var reservedNames = map[string]struct{}{
	"robots.txt": {}, "sitemap.xml": {}, "sitemap.txt": {},
	"favicon.ico": {}, "favicon.png": {}, "logo.png": {},
	"wicket": {}, "projects": {},
}

// DBStore implements project lifecycle against SQLite.
type DBStore struct {
	db      *sql.DB
	siteDir string
}

func NewDBStore(db *sql.DB, dataDir string) *DBStore {
	return &DBStore{
		db:      db,
		siteDir: filepath.Join(dataDir, "site"),
	}
}

func (s *DBStore) Get(ctx context.Context, id int64) (*Project, error) {
	row := s.db.QueryRowContext(ctx, projectSelect+" WHERE p.o_id = ?", id)
	return scanProject(row)
}

func (s *DBStore) GetByPath(ctx context.Context, path string) (*Project, error) {
	row := s.db.QueryRowContext(ctx, projectSelect+" WHERE p.o_path = ?", path)
	return scanProject(row)
}

func (s *DBStore) List(ctx context.Context) ([]*Project, error) {
	rows, err := s.db.QueryContext(ctx, projectSelect+" ORDER BY p.o_path")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*Project
	for rows.Next() {
		p, err := scanProjectRows(rows)
		if err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, rows.Err()
}

func (s *DBStore) Create(ctx context.Context, userID int64, p *Project) (*Project, error) {
	if err := validateName(p.Name); err != nil {
		return nil, err
	}
	if p.Key == "" {
		p.Key = deriveKey(p.Name)
	}
	if !projectKeyPattern.MatchString(p.Key) {
		return nil, fmt.Errorf("invalid project key %q", p.Key)
	}

	if p.ParentID != nil {
		parent, err := s.Get(ctx, *p.ParentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, fmt.Errorf("parent project not found")
		}
		p.Path = parent.Path + "/" + p.Name
	} else {
		p.Path = p.Name
	}
	p.PathLen = len(p.Path)

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var existing int
	if err := tx.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM o_Project WHERE o_path = ?
	`, p.Path).Scan(&existing); err != nil {
		return nil, err
	}
	if existing > 0 {
		return nil, ErrAlreadyExists
	}

	res, err := tx.ExecContext(ctx, `
		INSERT INTO o_ProjectLastActivityDate (o_value) VALUES (?)
	`, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	lastActivityID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	res, err = tx.ExecContext(ctx, `
		INSERT INTO o_Project (o_name, o_path, o_pathLen, o_key, o_description, o_parent_id, o_lastActivityDate_id, o_createDate)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, p.Name, p.Path, p.PathLen, p.Key, p.Description, p.ParentID, lastActivityID, now.Format(time.RFC3339))
	if err != nil {
		return nil, err
	}
	projectID, err := res.LastInsertId()
	if err != nil {
		return nil, err
	}

	_, err = tx.ExecContext(ctx, `
		INSERT INTO o_UserAuthorization (o_user_id, o_project_id, o_role_id)
		VALUES (?, ?, ?)
	`, userID, projectID, model.RoleOwnerID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	// Init bare git repo. Must happen after commit because we need the project ID
	// for the directory path. If it fails, delete the DB record so we don't leave
	// a project with no repository.
	if err := s.initGitRepo(projectID); err != nil {
		_ = s.deleteByID(ctx, projectID)
		return nil, fmt.Errorf("init git repo: %w", err)
	}

	return s.Get(ctx, projectID)
}

// deleteByID removes a project row by ID. Used as a compensating action when
// initGitRepo fails after the DB transaction has committed.
func (s *DBStore) deleteByID(ctx context.Context, id int64) error {
	_, err := s.db.ExecContext(ctx, `DELETE FROM o_Project WHERE o_id = ?`, id)
	return err
}

func (s *DBStore) Setup(ctx context.Context, userID int64, path string) (*Project, error) {
	path = strings.Trim(path, "/")
	if path == "" {
		return nil, ErrInvalidName
	}

	existing, err := s.GetByPath(ctx, path)
	if err != nil {
		return nil, err
	}
	if existing != nil {
		return existing, nil
	}

	parts := strings.Split(path, "/")
	var parentID *int64
	currentPath := ""
	for i, part := range parts {
		if i > 0 {
			currentPath += "/"
		}
		currentPath += part

		proj, err := s.GetByPath(ctx, currentPath)
		if err != nil {
			return nil, err
		}
		if proj != nil {
			parentID = &proj.ID
			continue
		}

		newProject := &Project{
			Name:     part,
			ParentID: parentID,
		}
		proj, err = s.Create(ctx, userID, newProject)
		if err != nil {
			return nil, err
		}
		parentID = &proj.ID
	}

	return s.GetByPath(ctx, path)
}

func (s *DBStore) ProjectDir(projectID int64) string {
	return filepath.Join(s.siteDir, "projects", fmt.Sprintf("%d", projectID))
}

func (s *DBStore) GitDir(projectID int64) string {
	return filepath.Join(s.ProjectDir(projectID), "git")
}

func (s *DBStore) initGitRepo(projectID int64) error {
	projectDir := s.ProjectDir(projectID)
	gitDir := s.GitDir(projectID)
	if err := os.MkdirAll(projectDir, 0o750); err != nil {
		return err
	}
	if err := os.MkdirAll(gitDir, 0o750); err != nil {
		return err
	}

	entries, err := os.ReadDir(gitDir)
	if err != nil {
		return err
	}
	if len(entries) > 0 {
		return nil
	}

	// TODO(buildx-server): use go-git for bare init (OneDev: JGit Git.init().setBare(true)).
	// MVP shells out to git; fails if git is not on PATH. See docs/ARCHITECTURE.md § Git engine.
	cmd := git.Cmd(gitDir, "init", "--bare")
	if out, err := cmd.CombinedOutput(); err != nil {
		return fmt.Errorf("%w: %s", err, strings.TrimSpace(string(out)))
	}
	return nil
}

func validateName(name string) error {
	if name == "" {
		return ErrInvalidName
	}
	if _, reserved := reservedNames[strings.ToLower(name)]; reserved {
		return ErrInvalidName
	}
	if strings.ContainsAny(name, "/\\") {
		return ErrInvalidName
	}
	return nil
}

func deriveKey(name string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(name) {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	key := b.String()
	if key == "" || !((key[0] >= 'A' && key[0] <= 'Z')) {
		key = "P" + key
	}
	return key
}

const projectSelect = `
	SELECT p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key, p.o_description, p.o_parent_id, p.o_createDate
	FROM o_Project p
`

func scanProject(row *sql.Row) (*Project, error) {
	var p Project
	var key sql.NullString
	var parentID sql.NullInt64
	var createDate string
	err := row.Scan(&p.ID, &p.Name, &p.Path, &p.PathLen, &key, &p.Description, &parentID, &createDate)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	if key.Valid {
		p.Key = key.String
	}
	if parentID.Valid {
		p.ParentID = &parentID.Int64
	}
	if t, err := time.Parse(time.RFC3339, createDate); err == nil {
		p.CreateDate = t
	}
	return &p, nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanProjectRows(rows rowScanner) (*Project, error) {
	var p Project
	var key sql.NullString
	var parentID sql.NullInt64
	var createDate string
	if err := rows.Scan(&p.ID, &p.Name, &p.Path, &p.PathLen, &key, &p.Description, &parentID, &createDate); err != nil {
		return nil, err
	}
	if key.Valid {
		p.Key = key.String
	}
	if parentID.Valid {
		p.ParentID = &parentID.Int64
	}
	if t, err := time.Parse(time.RFC3339, createDate); err == nil {
		p.CreateDate = t
	}
	return &p, nil
}
