package codecomment

import (
	"context"
	"database/sql"
	"testing"
	"time"

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
		INSERT INTO o_Project (o_id, o_name, o_path, o_pathLen, o_lastActivityDate_id, o_createDate)
		VALUES (1, 'demo', 'demo', 1, 1, '2026-01-01T00:00:00Z')`); err != nil {
		t.Fatal(err)
	}
	return NewDBStore(store.DB())
}

func TestCreateAndListByMark(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	created, err := s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "Looks good",
		Mark: model.Mark{
			CommitHash: "abc123",
			Path:       ".gitignore",
			Range:      &model.PlanarRange{FromRow: 3, FromColumn: 0, ToRow: 8, ToColumn: 12},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.ID == 0 {
		t.Fatal("expected id")
	}

	got, err := s.Get(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Content != "Looks good" {
		t.Fatalf("content = %q", got.Content)
	}

	list, err := s.ListByMark(ctx, 1, "abc123", ".gitignore")
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}

	commentsByProject, err := s.ListByProject(ctx, 1)
	if err != nil {
		t.Fatal(err)
	}
	if len(commentsByProject) != 1 {
		t.Fatalf("project len = %d", len(commentsByProject))
	}
}

func TestGetNotFound(t *testing.T) {
	s := setupStore(t)
	_, err := s.Get(context.Background(), 999)
	if err != ErrNotFound {
		t.Fatalf("err = %v", err)
	}
}

func TestDelete(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()
	created, err := s.Create(ctx, &model.CodeComment{
		ProjectID:  1,
		User:       &model.User{ID: 1},
		Content:    "delete me",
		CreateDate: time.Now().UTC(),
		Mark: model.Mark{
			CommitHash: "abc",
			Path:       "a.go",
			Range:      &model.PlanarRange{FromRow: 0, FromColumn: 0, ToRow: 0, ToColumn: 1},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	_, err = s.Get(ctx, created.ID)
	if err != ErrNotFound {
		t.Fatalf("err = %v", err)
	}
}

func TestCreateValidation(t *testing.T) {
	s := setupStore(t)
	_, err := s.Create(context.Background(), &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "",
		Mark: model.Mark{
			CommitHash: "abc",
			Path:       "a.go",
			Range:      &model.PlanarRange{},
		},
	})
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestReplyAndResolve(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()
	comment, err := s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "thread",
		Mark: model.Mark{
			CommitHash: "abc",
			Path:       "a.go",
			Range:      &model.PlanarRange{FromRow: 1, FromColumn: 0, ToRow: 1, ToColumn: 2},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	reply, err := s.CreateReply(ctx, comment.ID, &model.CodeCommentReply{
		User:    &model.User{ID: 1},
		Content: "first reply",
	})
	if err != nil {
		t.Fatal(err)
	}
	if reply.ID == 0 {
		t.Fatal("expected reply id")
	}

	replies, err := s.ListReplies(ctx, comment.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(replies) != 1 {
		t.Fatalf("len(replies) = %d", len(replies))
	}
	if replies[0].CommentID != comment.ID {
		t.Fatalf("commentID = %d", replies[0].CommentID)
	}

	got, err := s.Get(ctx, comment.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.ReplyCount != 1 {
		t.Fatalf("replyCount = %d", got.ReplyCount)
	}

	if err := s.SetResolved(ctx, comment.ID, true); err != nil {
		t.Fatal(err)
	}
	got, err = s.Get(ctx, comment.ID)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Resolved {
		t.Fatal("expected resolved")
	}
}

func TestListByCommitHashes(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	_, err := s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "on old",
		Mark: model.Mark{
			CommitHash: "oldhash",
			Path:       "a.go",
			Range:      &model.PlanarRange{FromRow: 1, FromColumn: 0, ToRow: 1, ToColumn: 5},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "on new",
		Mark: model.Mark{
			CommitHash: "newhash",
			Path:       "b.go",
			Range:      &model.PlanarRange{FromRow: 2, FromColumn: 0, ToRow: 2, ToColumn: 5},
		},
	})
	if err != nil {
		t.Fatal(err)
	}
	_, err = s.Create(ctx, &model.CodeComment{
		ProjectID: 1,
		User:      &model.User{ID: 1},
		Content:   "other",
		Mark: model.Mark{
			CommitHash: "other",
			Path:       "c.go",
			Range:      &model.PlanarRange{FromRow: 0, FromColumn: 0, ToRow: 0, ToColumn: 1},
		},
	})
	if err != nil {
		t.Fatal(err)
	}

	list, err := s.ListByCommitHashes(ctx, 1, []string{"oldhash", "newhash"})
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 2 {
		t.Fatalf("len = %d, want 2", len(list))
	}
}

var _ = sql.ErrNoRows
