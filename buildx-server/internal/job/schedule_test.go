package job

import (
	"context"
	"testing"
	"time"
)

func TestAcquireSequentialLock(t *testing.T) {
	svc := NewService(nil, nil, nil, nil, nil, nil)
	if !svc.acquireSequentialLock("", 60) {
		t.Fatal("empty group should always acquire")
	}
	if !svc.acquireSequentialLock("group-a", 60) {
		t.Fatal("first acquire should succeed")
	}
	if svc.acquireSequentialLock("group-a", 60) {
		t.Fatal("second acquire should fail while held")
	}
	svc.releaseSequentialLock("group-a")
	if !svc.acquireSequentialLock("group-a", 60) {
		t.Fatal("acquire after release should succeed")
	}
}

func TestScheduleCacheEmpty(t *testing.T) {
	c := NewScheduleCache()
	if len(c.snapshot()) != 0 {
		t.Fatal("expected empty cache")
	}
	c.set("1:main", nil)
	if len(c.snapshot()) != 0 {
		t.Fatal("empty schedules should remove key")
	}
}

func TestStartScheduleTickerStops(t *testing.T) {
	svc := NewService(nil, nil, nil, nil, nil, nil)
	ctx, cancel := context.WithCancel(context.Background())
	svc.StartScheduleTicker(ctx)
	cancel()
	time.Sleep(20 * time.Millisecond)
}

func TestParseScheduleKey(t *testing.T) {
	pid, branch := parseScheduleKey("42:feature/foo")
	if pid != 42 || branch != "feature/foo" {
		t.Fatalf("got %d %q", pid, branch)
	}
}
