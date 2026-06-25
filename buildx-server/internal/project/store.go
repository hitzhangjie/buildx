package project

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var (
	ErrNotFound      = errors.New("project not found")
	ErrAlreadyExists = errors.New("project already exists")
	ErrInvalidName   = errors.New("invalid project name")
	ErrCircularMove  = errors.New("circular move: cannot move a project under itself or one of its descendants")
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

// ListChildren returns the direct children of a project (one level only),
// ordered by name. Mirrors OneDev's ProjectCache.getChildren().
func (s *DBStore) ListChildren(ctx context.Context, parentID int64) ([]*Project, error) {
	rows, err := s.db.QueryContext(ctx, projectSelect+" WHERE p.o_parent_id = ? ORDER BY p.o_name", parentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var children []*Project
	for rows.Next() {
		p, err := scanProjectRows(rows)
		if err != nil {
			return nil, err
		}
		children = append(children, p)
	}
	if children == nil {
		children = []*Project{}
	}
	return children, rows.Err()
}

// CountChildren returns the count of direct children for a project.
func (s *DBStore) CountChildren(ctx context.Context, parentID int64) (int, error) {
	var count int
	err := s.db.QueryRowContext(ctx, "SELECT COUNT(*) FROM o_Project WHERE o_parent_id = ?", parentID).Scan(&count)
	return count, err
}

// descendantIDs returns all project IDs in the subtree rooted at projectID
// (including the project itself). Uses path-prefix matching on the denormalized
// o_path column for efficiency.
func (s *DBStore) descendantIDs(ctx context.Context, tx *sql.Tx, projectID int64) ([]int64, error) {
	// Fetch the project's path first.
	var path string
	err := tx.QueryRowContext(ctx, "SELECT o_path FROM o_Project WHERE o_id = ?", projectID).Scan(&path)
	if err != nil {
		return nil, err
	}

	// Find all projects whose path starts with path + "/" or equals path.
	rows, err := tx.QueryContext(ctx,
		"SELECT o_id FROM o_Project WHERE o_path = ? OR o_path LIKE ? ORDER BY o_pathLen DESC",
		path, path+"/%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []int64
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

// Move reparents a project to newParentID. Pass newParentID=nil to make it a
// root project. Returns ErrCircularMove if the move would create a cycle.
// Updates the path of the moved project and all its descendants.
func (s *DBStore) Move(ctx context.Context, projectID int64, newParentID *int64) (*Project, error) {
	p, err := s.Get(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrNotFound
	}

	// Validate new parent exists.
	var newParentPath string
	if newParentID != nil {
		parent, err := s.Get(ctx, *newParentID)
		if err != nil {
			return nil, err
		}
		if parent == nil {
			return nil, fmt.Errorf("parent project %d not found", *newParentID)
		}
		// Check circular: walking up from new parent must never hit projectID.
		if isAncestorOf(ctx, s.db, projectID, *newParentID) {
			return nil, ErrCircularMove
		}
		newParentPath = parent.Path
	}

	// Compute new path.
	var newPath string
	if newParentID == nil {
		newPath = p.Name
	} else {
		newPath = newParentPath + "/" + p.Name
	}
	oldPath := p.Path

	// Early return if path unchanged (same parent and same name).
	if oldPath == newPath {
		return p, nil
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Check name uniqueness under new parent.
	var existing int
	if newParentID == nil {
		err = tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_parent_id IS NULL AND o_name = ? AND o_id != ?",
			p.Name, projectID).Scan(&existing)
	} else {
		err = tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_parent_id = ? AND o_name = ? AND o_id != ?",
			*newParentID, p.Name, projectID).Scan(&existing)
	}
	if err != nil {
		return nil, err
	}
	if existing > 0 {
		return nil, ErrAlreadyExists
	}

	// Update the project itself.
	newPathLen := len(newPath)
	if _, err := tx.ExecContext(ctx,
		"UPDATE o_Project SET o_parent_id = ?, o_path = ?, o_pathLen = ? WHERE o_id = ?",
		newParentID, newPath, newPathLen, projectID); err != nil {
		return nil, err
	}

	// Update all descendants: replace old path prefix with new path.
	oldPrefix := oldPath + "/"
	newPrefix := newPath + "/"
	descendantRows, err := tx.QueryContext(ctx,
		"SELECT o_id, o_path FROM o_Project WHERE o_path LIKE ?",
		oldPrefix+"%")
	if err != nil {
		return nil, err
	}

	type descUpdate struct {
		id      int64
		newPath string
	}
	var updates []descUpdate
	for descendantRows.Next() {
		var id int64
		var dpath string
		if err := descendantRows.Scan(&id, &dpath); err != nil {
			descendantRows.Close()
			return nil, err
		}
		updatedPath := newPrefix + dpath[len(oldPrefix):]
		updates = append(updates, descUpdate{id: id, newPath: updatedPath})
	}
	descendantRows.Close()

	for _, u := range updates {
		if _, err := tx.ExecContext(ctx,
			"UPDATE o_Project SET o_path = ?, o_pathLen = ? WHERE o_id = ?",
			u.newPath, len(u.newPath), u.id); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.Get(ctx, projectID)
}

// isAncestorOf returns true iff ancestorID is an ancestor of projectID
// (or the same project). Walks the parent chain upward.
func isAncestorOf(ctx context.Context, db *sql.DB, ancestorID, projectID int64) bool {
	if ancestorID == projectID {
		return true
	}
	currentID := projectID
	for {
		var parentID sql.NullInt64
		err := db.QueryRowContext(ctx,
			"SELECT o_parent_id FROM o_Project WHERE o_id = ?", currentID).Scan(&parentID)
		if err != nil || !parentID.Valid {
			return false
		}
		if parentID.Int64 == ancestorID {
			return true
		}
		currentID = parentID.Int64
	}
}

// Delete removes a project, all its descendants, their git repositories on disk,
// and associated database records (authorizations, last activity date).
func (s *DBStore) Delete(ctx context.Context, id int64) error {
	p, err := s.Get(ctx, id)
	if err != nil {
		return err
	}
	if p == nil {
		return ErrNotFound
	}

	// Recursively delete children first. This ensures no orphans even
	// though the FK is ON DELETE SET NULL (safety net).
	children, err := s.ListChildren(ctx, id)
	if err != nil {
		return err
	}
	for _, child := range children {
		if err := s.Delete(ctx, child.ID); err != nil {
			return err
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Remove all user authorizations for this project.
	if _, err := tx.ExecContext(ctx, `DELETE FROM o_UserAuthorization WHERE o_project_id = ?`, id); err != nil {
		return err
	}

	// Delete the project row.
	if _, err := tx.ExecContext(ctx, `DELETE FROM o_Project WHERE o_id = ?`, id); err != nil {
		return err
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	// Remove project directory from disk (contains git repo).
	projectDir := s.ProjectDir(id)
	if err := os.RemoveAll(projectDir); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("remove project dir %s: %w", projectDir, err)
	}

	return nil
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

// Stats returns aggregate git statistics for a project (file count, commit
// count, branch count, tag count). Returns nil if the git repo cannot be
// opened or is empty.
func (s *DBStore) Stats(ctx context.Context, projectID int64) (*git.ProjectStats, error) {
	repo, err := git.Open(s.GitDir(projectID))
	if err != nil {
		return nil, nil // repo doesn't exist yet — not an error
	}

	commitCount, err := repo.CountCommits("")
	if err != nil {
		commitCount = 0
	}
	fileCount, err := repo.CountFiles("")
	if err != nil {
		fileCount = 0
	}

	return &git.ProjectStats{
		FileCount:      fileCount,
		CommitCount:    commitCount,
		BranchCount:    repo.CountBranches(),
		TagCount:       repo.CountTags(),
		WorkspaceCount: s.countWorkspaces(ctx, projectID),
	}, nil
}

func (s *DBStore) countWorkspaces(ctx context.Context, projectID int64) int {
	var count int
	if err := s.db.QueryRowContext(ctx,
		"SELECT COUNT(*) FROM o_Workspace WHERE o_project_id = ?", projectID).Scan(&count); err != nil {
		return 0
	}
	return count
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

	if err := git.InitBare(gitDir); err != nil {
		return fmt.Errorf("init bare repo: %w", err)
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
	if key == "" || !(key[0] >= 'A' && key[0] <= 'Z') {
		key = "P" + key
	}
	return key
}

// --- SQL query and scanning ---

const projectSelect = `
	SELECT p.o_id, p.o_name, p.o_path, p.o_pathLen, p.o_key,
	       p.o_description, p.o_parent_id, p.o_createDate,
	       p.o_codeManagement, p.o_packManagement, p.o_issueManagement, p.o_timeTracking,
	       p.o_serviceDeskEmailAddress,
	       p.o_gitPackConfig, p.o_codeAnalysisSetting, p.o_aiSetting,
	       p.o_branchProtections, p.o_tagProtections, p.o_issueSetting,
	       p.o_buildSetting, p.o_pullRequestSetting, p.o_packSetting,
	       p.o_workspaceSetting, p.o_namedCommitQueries, p.o_namedCodeCommentQueries,
	       p.o_webHooks, p.o_contributedSettings, p.o_workspaceSpecs
	FROM o_Project p
`

// scanDest holds pointers for scanning a project row with all settings columns.
type scanDest struct {
	id                                                       int64
	name, path                                               string
	pathLen                                                  int
	key, description, parentIDStr, createDate                sql.NullString
	codeMgmt, packMgmt, issueMgmt, timeTrack                 sql.NullBool
	serviceDeskEmail                                         sql.NullString
	gitPackJSON, codeAnalysisJSON, aiJSON                    sql.NullString
	branchProtJSON, tagProtJSON, issueSettingJSON            sql.NullString
	buildSettingJSON, prSettingJSON, packSettingJSON         sql.NullString
	workspaceSettingJSON, commitQueriesJSON, ccQueriesJSON   sql.NullString
	webHooksJSON, contributedJSON, workspaceSpecsJSON        sql.NullString
}

func (d *scanDest) pointers() []any {
	return []any{
		&d.id, &d.name, &d.path, &d.pathLen, &d.key,
		&d.description, &d.parentIDStr, &d.createDate,
		&d.codeMgmt, &d.packMgmt, &d.issueMgmt, &d.timeTrack,
		&d.serviceDeskEmail,
		&d.gitPackJSON, &d.codeAnalysisJSON, &d.aiJSON,
		&d.branchProtJSON, &d.tagProtJSON, &d.issueSettingJSON,
		&d.buildSettingJSON, &d.prSettingJSON, &d.packSettingJSON,
		&d.workspaceSettingJSON, &d.commitQueriesJSON, &d.ccQueriesJSON,
		&d.webHooksJSON, &d.contributedJSON, &d.workspaceSpecsJSON,
	}
}

func (d *scanDest) toProject() *Project {
	p := &Project{
		ID:       d.id,
		Name:     d.name,
		Path:     d.path,
		PathLen:  d.pathLen,
	}
	if d.key.Valid {
		p.Key = d.key.String
	}
	if d.description.Valid {
		p.Description = d.description.String
	}
	if v, err := strconv.ParseInt(d.parentIDStr.String, 10, 64); err == nil && d.parentIDStr.Valid {
		p.ParentID = &v
	}
	if t, err := time.Parse(time.RFC3339, d.createDate.String); err == nil && d.createDate.Valid {
		p.CreateDate = t
	}
	p.CodeManagement = nullBool(d.codeMgmt, true)
	p.PackManagement = nullBool(d.packMgmt, true)
	p.IssueManagement = nullBool(d.issueMgmt, true)
	p.TimeTracking = nullBool(d.timeTrack, false)
	if d.serviceDeskEmail.Valid {
		p.ServiceDeskEmailAddress = d.serviceDeskEmail.String
	}
	// Assemble settings from JSON columns
	p.Settings = &model.ProjectSetting{
		GitPackConfig:           unmarshalOrNil[*model.GitPackConfig](d.gitPackJSON),
		CodeAnalysisSetting:     unmarshalOrNil[*model.CodeAnalysisSetting](d.codeAnalysisJSON),
		AiSetting:               unmarshalOrNil[*model.AiSetting](d.aiJSON),
		BranchProtections:       unmarshalSliceOrNil[*model.BranchProtection](d.branchProtJSON),
		TagProtections:          unmarshalSliceOrNil[*model.TagProtection](d.tagProtJSON),
		IssueSetting:            unmarshalOrNil[*model.IssueSetting](d.issueSettingJSON),
		BuildSetting:            unmarshalOrNil[*model.BuildSetting](d.buildSettingJSON),
		PullRequestSetting:      unmarshalOrNil[*model.PullRequestSetting](d.prSettingJSON),
		PackSetting:             unmarshalOrNil[*model.PackSetting](d.packSettingJSON),
		WorkspaceSetting:        unmarshalOrNil[*model.WorkspaceSetting](d.workspaceSettingJSON),
		NamedCommitQueries:      unmarshalSliceOrNil[*model.NamedCommitQuery](d.commitQueriesJSON),
		NamedCodeCommentQueries: unmarshalSliceOrNil[*model.NamedCodeCommentQuery](d.ccQueriesJSON),
		WebHooks:                unmarshalSliceOrNil[*model.WebHook](d.webHooksJSON),
		WorkspaceSpecs:          unmarshalSliceOrNil[*model.WorkspaceSpec](d.workspaceSpecsJSON),
	}
	return p
}

func scanProject(row *sql.Row) (*Project, error) {
	d := scanDest{}
	err := row.Scan(d.pointers()...)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return d.toProject(), nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanProjectRows(rows rowScanner) (*Project, error) {
	d := scanDest{}
	if err := rows.Scan(d.pointers()...); err != nil {
		return nil, err
	}
	return d.toProject(), nil
}

// --- Update / Settings methods ---

// Update persists changes to a project's general information fields.
// Mirrors OneDev's POST /~api/projects/{projectId} (updateProject).
func (s *DBStore) Update(ctx context.Context, p *Project) error {
	if p.ID == 0 {
		return fmt.Errorf("project ID is required for update")
	}
	if err := validateName(p.Name); err != nil {
		return err
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Validate key uniqueness (if key provided).
	if p.Key != "" {
		var count int
		if err := tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_key = ? AND o_id != ?",
			p.Key, p.ID).Scan(&count); err != nil {
			return err
		}
		if count > 0 {
			return fmt.Errorf("project key %q already in use", p.Key)
		}
	}

	// Validate parent.
	if p.ParentID != nil {
		var parentExists int
		if err := tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_id = ?", *p.ParentID).Scan(&parentExists); err != nil {
			return err
		}
		if parentExists == 0 {
			return fmt.Errorf("parent project %d not found", *p.ParentID)
		}
		// Check circular reference via the global DB handle.
		if isAncestorOf(ctx, s.db, p.ID, *p.ParentID) {
			return ErrCircularMove
		}
	}

	// Check name uniqueness under parent.
	var dupCheck int
	if p.ParentID == nil {
		err = tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_parent_id IS NULL AND o_name = ? AND o_id != ?",
			p.Name, p.ID).Scan(&dupCheck)
	} else {
		err = tx.QueryRowContext(ctx,
			"SELECT COUNT(*) FROM o_Project WHERE o_parent_id = ? AND o_name = ? AND o_id != ?",
			*p.ParentID, p.Name, p.ID).Scan(&dupCheck)
	}
	if err != nil {
		return err
	}
	if dupCheck > 0 {
		return ErrAlreadyExists
	}

	_, err = tx.ExecContext(ctx, `
		UPDATE o_Project SET
			o_name = ?, o_key = ?, o_description = ?,
			o_parent_id = ?,
			o_codeManagement = ?, o_packManagement = ?,
			o_issueManagement = ?, o_timeTracking = ?,
			o_serviceDeskEmailAddress = ?
		WHERE o_id = ?
	`, p.Name, nullStr(p.Key), nullStr(p.Description),
		p.ParentID,
		boolToInt(p.CodeManagement), boolToInt(p.PackManagement),
		boolToInt(p.IssueManagement), boolToInt(p.TimeTracking),
		nullStr(p.ServiceDeskEmailAddress),
		p.ID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GetSetting reads all project settings from JSON columns and returns them
// assembled into a single ProjectSetting struct.
// Mirrors OneDev's GET /~api/projects/{projectId}/setting.
func (s *DBStore) GetSetting(ctx context.Context, projectID int64) (*model.ProjectSetting, error) {
	p, err := s.Get(ctx, projectID)
	if err != nil {
		return nil, err
	}
	if p == nil {
		return nil, ErrNotFound
	}
	if p.Settings == nil {
		return &model.ProjectSetting{}, nil
	}
	return p.Settings, nil
}

// UpdateSetting serializes each settings sub-model to JSON and updates the
// corresponding columns on the project row.
// Mirrors OneDev's POST /~api/projects/{projectId}/setting.
func (s *DBStore) UpdateSetting(ctx context.Context, projectID int64, setting *model.ProjectSetting) error {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.ExecContext(ctx, `
		UPDATE o_Project SET
			o_gitPackConfig = ?,
			o_codeAnalysisSetting = ?,
			o_aiSetting = ?,
			o_branchProtections = ?,
			o_tagProtections = ?,
			o_issueSetting = ?,
			o_buildSetting = ?,
			o_pullRequestSetting = ?,
			o_packSetting = ?,
			o_workspaceSetting = ?,
			o_namedCommitQueries = ?,
			o_namedCodeCommentQueries = ?,
			o_webHooks = ?,
			o_contributedSettings = ?,
			o_workspaceSpecs = ?
		WHERE o_id = ?
	`,
		marshalOrEmpty(setting.GitPackConfig),
		marshalOrEmpty(setting.CodeAnalysisSetting),
		marshalOrEmpty(setting.AiSetting),
		marshalSliceOrEmpty(setting.BranchProtections),
		marshalSliceOrEmpty(setting.TagProtections),
		marshalOrEmpty(setting.IssueSetting),
		marshalOrEmpty(setting.BuildSetting),
		marshalOrEmpty(setting.PullRequestSetting),
		marshalOrEmpty(setting.PackSetting),
		marshalOrEmpty(setting.WorkspaceSetting),
		marshalSliceOrEmpty(setting.NamedCommitQueries),
		marshalSliceOrEmpty(setting.NamedCodeCommentQueries),
		marshalSliceOrEmpty(setting.WebHooks),
		marshalOrEmpty(setting.ContributedSettings),
		marshalSliceOrEmpty(setting.WorkspaceSpecs),
		projectID,
	)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// --- helpers ---

func nullBool(nb sql.NullBool, defaultVal bool) bool {
	if !nb.Valid {
		return defaultVal
	}
	return nb.Bool
}

func unmarshalOrNil[T any](ns sql.NullString) T {
	var zero T
	if !ns.Valid {
		return zero
	}
	s := strings.TrimSpace(ns.String)
	if s == "" || s == "{}" {
		return zero
	}
	if err := json.Unmarshal([]byte(s), &zero); err != nil {
		return zero
	}
	return zero
}

func unmarshalSliceOrNil[T any](ns sql.NullString) []T {
	if !ns.Valid {
		return nil
	}
	s := strings.TrimSpace(ns.String)
	if s == "" || s == "[]" {
		return nil
	}
	var v []T
	if err := json.Unmarshal([]byte(s), &v); err != nil {
		return nil
	}
	return v
}

func nullStr(s string) any {
	if s == "" {
		return nil
	}
	return s
}

func boolToInt(b bool) int {
	if b {
		return 1
	}
	return 0
}

func marshalOrEmpty(v any) string {
	if v == nil {
		return "{}"
	}
	data, err := json.Marshal(v)
	if err != nil {
		return "{}"
	}
	return string(data)
}

func marshalSliceOrEmpty(v any) string {
	if v == nil {
		return "[]"
	}
	data, err := json.Marshal(v)
	if err != nil {
		return "[]"
	}
	return string(data)
}
