package executor_test

import (
	"context"
	"errors"
	"fmt"
	"sync"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// ---------------------------------------------------------------------------
// Registry tests
// ---------------------------------------------------------------------------

func TestNewRegistry_IsEmpty(t *testing.T) {
	r := executor.NewRegistry()
	if got := len(r.List()); got != 0 {
		t.Fatalf("expected empty registry, got %d executors", got)
	}
	if got := len(r.Configs()); got != 0 {
		t.Fatalf("expected empty configs, got %d", got)
	}
}

func TestRegistry_RegisterAndGet(t *testing.T) {
	r := executor.NewRegistry()
	e := new(mockExecutor)
	e.name = "test-exec"

	r.Register(e, nil)

	got, ok := r.Get("test-exec")
	if !ok {
		t.Fatal("expected to find registered executor")
	}
	if got.Name() != "test-exec" {
		t.Fatalf("got name %q", got.Name())
	}
}

func TestRegistry_Get_NotFound(t *testing.T) {
	r := executor.NewRegistry()
	_, ok := r.Get("nonexistent")
	if ok {
		t.Fatal("expected false for nonexistent executor")
	}
}

func TestRegistry_RegisterReplaces(t *testing.T) {
	r := executor.NewRegistry()
	r.Register(&mockExecutor{name: "a"}, nil)
	r.Register(&mockExecutor{name: "a"}, nil)

	if len(r.List()) != 1 {
		t.Fatalf("expected 1 executor after re-register, got %d", len(r.List()))
	}
}

func TestRegistry_List(t *testing.T) {
	r := executor.NewRegistry()
	r.Register(&mockExecutor{name: "a"}, nil)
	r.Register(&mockExecutor{name: "b"}, nil)

	list := r.List()
	if len(list) != 2 {
		t.Fatalf("expected 2 executors, got %d", len(list))
	}
}

func TestRegistry_Find_SelectsFirstEnabledMatching(t *testing.T) {
	r := executor.NewRegistry()

	// Register two executors; only the second matches.
	e1 := &mockExecutor{name: "a", applicable: false}
	e2 := &mockExecutor{name: "b", applicable: true}
	r.Register(e1, &executor.ExecutorConfig{Name: "a", Enabled: true})
	r.Register(e2, &executor.ExecutorConfig{Name: "b", Enabled: true})

	ctx := context.Background()
	jc := &executor.JobContext{}

	found, ok := r.Find(ctx, jc)
	if !ok {
		t.Fatal("expected to find an executor")
	}
	if found.Name() != "b" {
		t.Fatalf("expected executor 'b', got %q", found.Name())
	}
}

func TestRegistry_Find_SkipsDisabled(t *testing.T) {
	r := executor.NewRegistry()
	e := &mockExecutor{name: "disabled-exec", applicable: true}
	r.Register(e, &executor.ExecutorConfig{Name: "disabled-exec", Enabled: false})

	ctx := context.Background()
	_, ok := r.Find(ctx, &executor.JobContext{})
	if ok {
		t.Fatal("expected no match for disabled executor")
	}
}

func TestRegistry_Find_NoMatch(t *testing.T) {
	r := executor.NewRegistry()
	r.Register(&mockExecutor{name: "x", applicable: false},
		&executor.ExecutorConfig{Name: "x", Enabled: true})

	_, ok := r.Find(context.Background(), &executor.JobContext{})
	if ok {
		t.Fatal("expected no match when no executor is applicable")
	}
}

func TestRegistry_Configs_ReturnsCopy(t *testing.T) {
	r := executor.NewRegistry()
	r.Register(&mockExecutor{name: "e1"}, &executor.ExecutorConfig{Name: "e1", Enabled: true})

	cfgs := r.Configs()
	if len(cfgs) != 1 {
		t.Fatalf("expected 1 config, got %d", len(cfgs))
	}

	// Mutating the returned config should not affect the registry.
	cfgs[0].Enabled = false
	originals := r.Configs()
	if !originals[0].Enabled {
		t.Fatal("registry config should not be affected by external mutation")
	}
}

func TestRegistry_UpdateConfig(t *testing.T) {
	r := executor.NewRegistry()
	r.Register(&mockExecutor{name: "e1"}, &executor.ExecutorConfig{Name: "e1", Enabled: true})

	err := r.UpdateConfig("e1", &executor.ExecutorConfig{Name: "e1", Enabled: false})
	if err != nil {
		t.Fatal(err)
	}

	cfgs := r.Configs()
	if cfgs[0].Enabled {
		t.Fatal("expected config to be updated to disabled")
	}
}

func TestRegistry_UpdateConfig_NotFound(t *testing.T) {
	r := executor.NewRegistry()
	err := r.UpdateConfig("nonexistent", &executor.ExecutorConfig{Name: "nonexistent"})
	if err == nil {
		t.Fatal("expected error for nonexistent executor")
	}
}

func TestRegistry_ConcurrentAccess(t *testing.T) {
	r := executor.NewRegistry()
	ctx := context.Background()

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			name := fmt.Sprintf("e-%d", n)
			r.Register(&mockExecutor{name: name}, &executor.ExecutorConfig{Name: name, Enabled: n%2 == 0})
		}(i)
	}
	wg.Wait()

	if len(r.List()) != 20 {
		t.Fatalf("expected 20 executors, got %d", len(r.List()))
	}

	// Concurrent reads.
	var wg2 sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg2.Add(1)
		go func() {
			defer wg2.Done()
			_ = r.List()
			_ = r.Configs()
			r.Find(ctx, &executor.JobContext{})
		}()
	}
	wg2.Wait()
}

// ---------------------------------------------------------------------------
// BuildLogger tests
// ---------------------------------------------------------------------------

func TestBuildLogger_LogAndEntries(t *testing.T) {
	l := executor.NewBuildLogger(42)
	l.Log("info", "hello world")
	l.Stdout("some output")
	l.Stderr("some error")

	entries := l.Entries()
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries, got %d", len(entries))
	}
	if entries[0].Level != "info" || entries[0].Message != "hello world" {
		t.Fatalf("entry 0: %+v", entries[0])
	}
	if entries[1].Level != "stdout" {
		t.Fatalf("expected stdout level, got %q", entries[1].Level)
	}
	if entries[2].Level != "stderr" {
		t.Fatalf("expected stderr level, got %q", entries[2].Level)
	}
}

func TestBuildLogger_Logf(t *testing.T) {
	l := executor.NewBuildLogger(1)
	l.Logf("warn", "format %d", 42)

	entries := l.Entries()
	if len(entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(entries))
	}
	if entries[0].Message != "format 42" {
		t.Fatalf("got message %q", entries[0].Message)
	}
}

func TestBuildLogger_Entries_ReturnsCopy(t *testing.T) {
	l := executor.NewBuildLogger(1)
	l.Log("info", "a")

	entries := l.Entries()
	entries[0].Message = "mutated"

	entries2 := l.Entries()
	if entries2[0].Message != "a" {
		t.Fatal("entries should return a copy")
	}
}

func TestBuildLogger_SubscribeReceivesEntries(t *testing.T) {
	l := executor.NewBuildLogger(1)
	ch := l.Subscribe()
	defer l.Unsubscribe(ch)

	l.Stdout("line 1")
	l.Stdout("line 2")

	entry1 := <-ch
	if entry1.Message != "line 1" {
		t.Fatalf("expected 'line 1', got %q", entry1.Message)
	}
	entry2 := <-ch
	if entry2.Message != "line 2" {
		t.Fatalf("expected 'line 2', got %q", entry2.Message)
	}
}

func TestBuildLogger_Unsubscribe(t *testing.T) {
	l := executor.NewBuildLogger(1)
	ch := l.Subscribe()
	l.Unsubscribe(ch)

	// Should not block; the channel is no longer in the listener list.
	l.Stdout("after unsubscribe")

	// The old channel should not receive the entry (or it may be dropped).
	// Just verify the logger doesn't panic and entries are still stored.
	if len(l.Entries()) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(l.Entries()))
	}
}

func TestBuildLogger_DropSlowConsumer(t *testing.T) {
	l := executor.NewBuildLogger(1)
	_ = l.Subscribe() // consumer that never reads

	// Fill the channel buffer (64).
	for i := 0; i < 128; i++ {
		l.Log("info", "spam")
	}

	// Should not panic; entries beyond buffer are dropped for the slow consumer.
	if len(l.Entries()) != 128 {
		t.Fatalf("expected 128 entries stored, got %d", len(l.Entries()))
	}
}

func TestBuildLogger_ConcurrentWrites(t *testing.T) {
	l := executor.NewBuildLogger(1)

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			l.Logf("info", "concurrent %d", n)
		}(i)
	}
	wg.Wait()

	if len(l.Entries()) != 50 {
		t.Fatalf("expected 50 entries, got %d", len(l.Entries()))
	}
}

// ---------------------------------------------------------------------------
// NopLogger tests
// ---------------------------------------------------------------------------

func TestNopLogger_NoPanic(t *testing.T) {
	var n executor.NopLogger
	n.Log("info", "x")
	n.Logf("info", "x %d", 1)
	n.Stdout("x")
	n.Stderr("x")
}

// ---------------------------------------------------------------------------
// JobContext / StepResult basics
// ---------------------------------------------------------------------------

func TestStepResult_JSONTags(t *testing.T) {
	// Compile-time check: if JSON tags are wrong, encoding/json will use field names.
	// We just verify the struct compiles and has expected field types.
	r := executor.StepResult{
		Name:       "test",
		Success:    true,
		ExitCode:   0,
		DurationMs: 100,
		Error:      "",
	}
	if r.Name != "test" || !r.Success {
		t.Fatal("basic field access")
	}
}

func TestJobContext_Fields(t *testing.T) {
	jc := &executor.JobContext{
		BuildID:     1,
		BuildNumber: 42,
		ProjectID:   10,
		ProjectPath: "my-project",
		JobName:     "CI",
		JobToken:    "token-abc",
		CommitHash:  "abc123",
		RefName:     "refs/heads/main",
		WorkDir:     "/tmp/builds",
		AgentID:     0,
		EnvVars:     map[string]string{"KEY": "value"},
		ParamMap:    map[string]string{"param1": "val1"},
		Timeout:     3600,
	}
	if jc.BuildNumber != 42 || jc.EnvVars["KEY"] != "value" {
		t.Fatal("basic field access")
	}
}

// ---------------------------------------------------------------------------
// mockExecutor
// ---------------------------------------------------------------------------

type mockExecutor struct {
	name        string
	enabled     bool
	applicable  bool
	htmlReports bool
	sitePublish bool
}

func (m *mockExecutor) Name() string {
	return m.name
}

func (m *mockExecutor) Enabled() bool {
	return m.enabled
}

func (m *mockExecutor) IsApplicable(ctx context.Context, jobCtx *executor.JobContext) bool {
	return m.applicable
}

func (m *mockExecutor) SupportsHTMLReports() bool {
	return m.htmlReports
}

func (m *mockExecutor) SupportsSitePublishing() bool {
	return m.sitePublish
}

func (m *mockExecutor) Execute(ctx context.Context, jobCtx *executor.JobContext, commands []string, logger executor.TaskLogger) ([]executor.StepResult, error) {
	return m.ExecutePlan(ctx, jobCtx, execplan.NewCommandsPlan(commands), logger)
}

func (m *mockExecutor) ExecutePlan(ctx context.Context, jobCtx *executor.JobContext, plan *execplan.Plan, logger executor.TaskLogger) ([]executor.StepResult, error) {
	return nil, errors.New("not implemented")
}
