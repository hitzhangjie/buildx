package issue

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func setupStore(t *testing.T) *DBStore {
	t.Helper()
	store, err := sqlite.Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	if err := store.Migrate(context.Background()); err != nil {
		t.Fatal(err)
	}
	ctx := context.Background()
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_User (o_id, o_name, o_fullName, o_type, o_disabled, o_password)
		VALUES (1, 'admin', 'Admin', 'ORDINARY', 0, 'x')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_ProjectLastActivityDate (o_id, o_value) VALUES (1, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	if _, err := store.DB().ExecContext(ctx, `
		INSERT INTO o_Project (o_id, o_name, o_path, o_pathLen, o_key, o_lastActivityDate_id, o_createDate)
		VALUES (1, 'demo', 'demo', 1, 'DEMO', 1, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	return NewDBStore(store.DB())
}

func TestCreateAndQueryIssue(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	created, err := s.Create(ctx, &model.Issue{
		ProjectID:   1,
		Title:       "First issue",
		Description: "Details here",
		Submitter:   &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Number != 1 {
		t.Fatalf("number = %d", created.Number)
	}
	if created.State != DefaultState {
		t.Fatalf("state = %q", created.State)
	}

	got, err := s.GetByNumber(ctx, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if got.Title != "First issue" {
		t.Fatalf("title = %q", got.Title)
	}

	list, err := s.Query(ctx, ParseQuery(`"Project" is "demo"`), 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}
}

func TestIssueComments(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	issue, err := s.Create(ctx, &model.Issue{
		ProjectID: 1,
		Title:     "Comment me",
		Submitter: &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}

	comment, err := s.CreateComment(ctx, &model.IssueComment{
		IssueID: issue.ID,
		User:    &model.User{ID: 1},
		Content: "Looks good",
	})
	if err != nil {
		t.Fatal(err)
	}
	if comment.ID == 0 {
		t.Fatal("expected comment id")
	}

	comments, err := s.ListComments(ctx, issue.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(comments) != 1 {
		t.Fatalf("len = %d", len(comments))
	}

	updated, err := s.Get(ctx, issue.ID)
	if err != nil {
		t.Fatal(err)
	}
	if updated.CommentCount != 1 {
		t.Fatalf("commentCount = %d", updated.CommentCount)
	}
}

func TestUpdateState(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	issue, err := s.Create(ctx, &model.Issue{
		ProjectID: 1,
		Title:     "State change",
		Submitter: &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.UpdateState(ctx, issue.ID, StateClosed); err != nil {
		t.Fatal(err)
	}
	got, err := s.Get(ctx, issue.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.State != StateClosed {
		t.Fatalf("state = %q", got.State)
	}
}
