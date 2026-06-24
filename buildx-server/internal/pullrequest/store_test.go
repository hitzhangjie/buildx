package pullrequest_test

import (
	"context"
	"os/exec"
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
	"github.com/hitzhangjie/buildx/buildx-server/internal/testutil"
)

func setupStore(t *testing.T) (*pullrequest.DBStore, context.Context) {
	t.Helper()
	store, _, _ := testutil.OpenTestDB(t)
	ctx := context.Background()
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_User (o_id, o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (1, 'admin', 'Admin', 'ORDINARY', 0, 'x')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_ProjectLastActivityDate (o_id, o_value) VALUES (2, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_Project (o_id, o_name, o_path, o_pathLen, o_lastActivityDate_id, o_createDate)
		VALUES (2, 'demo', 'demo', 1, 2, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	return pullrequest.NewDBStore(store.DB()), ctx
}

func TestParseNumberQuery(t *testing.T) {
	path, number, ok := pullrequest.ParseNumberQuery(`"Number" is "demo#12"`)
	if !ok || path != "demo" || number != 12 {
		t.Fatalf("got %q %d %v", path, number, ok)
	}
}

func TestDBStoreCreateAndQuery(t *testing.T) {
	store, ctx := setupStore(t)

	pr, err := store.Create(ctx, &model.PullRequest{
		Title:         "Add feature",
		Description:   "desc",
		TargetProject: &model.Project{ID: 2},
		SourceProject: &model.Project{ID: 2},
		TargetBranch:  "main",
		SourceBranch:  "feature",
	}, 1)
	if err != nil {
		t.Fatal(err)
	}
	if pr.Number != 1 {
		t.Fatalf("number = %d, want 1", pr.Number)
	}

	got, err := store.GetByNumber(ctx, 2, 1)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "Add feature" {
		t.Fatalf("title = %q", got.Title)
	}

	projectID := int64(2)
	list, err := store.Query(ctx, pullrequest.QueryOptions{TargetProjectID: &projectID})
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}
}

func TestServiceOpenAndMergeFastForward(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git not found")
	}
	store, ctx := setupStore(t)
	dataDir := t.TempDir()
	gitDir := filepath.Join(dataDir, "site", "projects", "2", "git")
	testutil.InitBareRepo(t, gitDir)
	workDir := t.TempDir()
	testutil.InitWorkRepo(t, workDir)
	testutil.CommitFile(t, workDir, "README.md", "main\n", "main commit")
	testutil.Push(t, workDir, gitDir, "HEAD:refs/heads/main")
	testutil.CommitFile(t, workDir, "feature.txt", "feature\n", "feature commit")
	testutil.Push(t, workDir, gitDir, "HEAD:refs/heads/feature")

	projectGit := &testGitDir{dir: gitDir}
	svc := &pullrequest.Service{Store: store, Project: projectGit}
	user := &model.User{ID: 1, Name: "admin"}

	created, err := svc.Open(ctx, &model.PullRequestOpenData{
		TargetProjectID: 2,
		SourceProjectID: 2,
		TargetBranch:    "main",
		SourceBranch:    "feature",
		Title:           "Feature PR",
		Description:     "Adds feature",
	}, user)
	if err != nil {
		t.Fatal(err)
	}
	if created.Status != model.PullRequestStatusOpen {
		t.Fatalf("status = %q", created.Status)
	}

	if err := svc.Merge(ctx, created, user, "merged"); err != nil {
		t.Fatal(err)
	}
	merged, err := store.Get(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if merged.Status != model.PullRequestStatusMerged {
		t.Fatalf("status = %q", merged.Status)
	}
}

type testGitDir struct {
	dir string
}

func (g *testGitDir) GitDir(projectID int64) string {
	return g.dir
}
