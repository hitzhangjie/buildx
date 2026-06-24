package issue

import (
	"context"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func TestIterationCRUD(t *testing.T) {
	s := setupStore(t)
	ctx := context.Background()

	start := int64(EpochDay(mustParseDate(t, "2026-06-01")))
	due := int64(EpochDay(mustParseDate(t, "2026-06-14")))

	created, err := s.CreateIteration(ctx, &model.Iteration{
		ProjectID: 1,
		Name:      "Sprint 1",
		StartDay:  &start,
		DueDay:    &due,
	})
	if err != nil {
		t.Fatal(err)
	}

	list, err := s.ListIterations(ctx, 1, "", nil, 0, 10)
	if err != nil {
		t.Fatal(err)
	}
	if len(list) != 1 {
		t.Fatalf("len = %d", len(list))
	}

	got, err := s.GetIteration(ctx, created.ID)
	if err != nil {
		t.Fatal(err)
	}
	if got.Name != "Sprint 1" {
		t.Fatalf("name = %q", got.Name)
	}
}

func mustParseDate(t *testing.T, s string) time.Time {
	t.Helper()
	day, err := ParseISODate(s)
	if err != nil {
		t.Fatal(err)
	}
	return FromEpochDay(day)
}
