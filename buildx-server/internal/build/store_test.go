package build_test

import (
	"context"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/persistence/sqlite"
)

func setupStore(t *testing.T) *build.DBStore {
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
	return build.NewDBStore(store.DB())
}

func TestCreateAndQueryBuild(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	now := time.Now().UTC()
	finish := now.Add(5 * time.Minute)
	created, err := s.Create(ctx, &model.Build{
		ProjectID:  1,
		JobName:    "CI",
		Status:     model.BuildStatusSuccessful,
		RefName:    "refs/heads/main",
		CommitHash: "abc123",
		SubmitDate: now,
		FinishDate: &finish,
		Submitter:  &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if created.Number != 1 {
		t.Fatalf("number = %d", created.Number)
	}

	got, err := s.GetByNumber(ctx, 1, 1)
	if err != nil {
		t.Fatal(err)
	}
	if got.JobName != "CI" || got.Project.Path != "demo" {
		t.Fatalf("got %+v", got)
	}

	builds, err := s.Query(ctx, build.QueryFilter{ProjectPath: "demo"}, 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(builds) != 1 {
		t.Fatalf("len = %d", len(builds))
	}
}

func TestUpdateDescriptionAndDelete(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	created, err := s.Create(ctx, &model.Build{
		ProjectID: 1,
		JobName:   "Deploy",
		Submitter: &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := s.UpdateDescription(ctx, created.ID, "release notes"); err != nil {
		t.Fatal(err)
	}
	got, err := s.Get(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Description != "release notes" {
		t.Fatalf("description = %q", got.Description)
	}
	if err := s.Delete(ctx, created.ID); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Get(ctx, created.ID); err == nil {
		t.Fatal("expected not found after delete")
	}
}

func TestBuildDurationFields(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	submit := time.Date(2026, 6, 26, 12, 0, 0, 0, time.UTC)
	pending := submit.Add(2 * time.Second)
	running := pending.Add(3 * time.Second)
	finish := running.Add(5 * time.Second)

	created, err := s.Create(ctx, &model.Build{
		ProjectID:   1,
		JobName:     "CI",
		Status:      model.BuildStatusSuccessful,
		SubmitDate:  submit,
		PendingDate: &pending,
		RunningDate: &running,
		FinishDate:  &finish,
		Submitter:   &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}

	got, err := s.Get(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.PendingDuration != 3000 {
		t.Fatalf("pendingDuration = %d, want 3000", got.PendingDuration)
	}
	if got.RunningDuration != 5000 {
		t.Fatalf("runningDuration = %d, want 5000", got.RunningDuration)
	}
}
