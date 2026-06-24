package issue

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func TestIssueIterationSchedule(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	start := int64(EpochDay(mustParseDate(t, "2026-06-01")))
	due := int64(EpochDay(mustParseDate(t, "2026-06-14")))
	iter, err := s.CreateIteration(ctx, &model.Iteration{
		ProjectID: 1,
		Name:      "Sprint A",
		StartDay:  &start,
		DueDay:    &due,
	})
	if err != nil {
		t.Fatal(err)
	}

	issue, err := s.Create(ctx, &model.Issue{
		ProjectID: 1,
		Title:     "Scheduled task",
		Submitter: &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}

	if err := s.SetIssueIterations(ctx, issue.ID, []int64{iter.ID}); err != nil {
		t.Fatal(err)
	}

	iters, err := s.ListIssueIterations(ctx, issue.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(iters) != 1 || iters[0].ID != iter.ID {
		t.Fatalf("iters = %+v", iters)
	}

	issues, err := s.ListIssuesByIteration(ctx, iter.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(issues) != 1 || issues[0].ID != issue.ID {
		t.Fatalf("issues = %+v", issues)
	}

	stats, err := s.CountIssuesByIterationState(ctx, iter.ID)
	if err != nil {
		t.Fatal(err)
	}
	if stats[StateOpen] != 1 {
		t.Fatalf("stats = %+v", stats)
	}
}

func TestQueryByIterationName(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	start := int64(EpochDay(mustParseDate(t, "2026-06-01")))
	due := int64(EpochDay(mustParseDate(t, "2026-06-14")))
	iter, err := s.CreateIteration(ctx, &model.Iteration{
		ProjectID: 1,
		Name:      "Sprint B",
		StartDay:  &start,
		DueDay:    &due,
	})
	if err != nil {
		t.Fatal(err)
	}

	issue, err := s.Create(ctx, &model.Issue{
		ProjectID: 1,
		Title:     "In sprint",
		Submitter: &model.User{ID: 1},
	})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := s.Create(ctx, &model.Issue{
		ProjectID: 1,
		Title:     "Outside sprint",
		Submitter: &model.User{ID: 1},
	}); err != nil {
		t.Fatal(err)
	}
	if err := s.SetIssueIterations(ctx, issue.ID, []int64{iter.ID}); err != nil {
		t.Fatal(err)
	}

	filter := ParseQuery(`"Iteration" is "Sprint B"`)
	filter.ProjectID = 1
	list, err := s.Query(ctx, filter, 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 || list[0].ID != issue.ID {
		t.Fatalf("list = %+v", list)
	}
}
