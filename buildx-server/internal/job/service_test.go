package job

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// ---------------------------------------------------------------------------
// State machine tests
// ---------------------------------------------------------------------------

func TestBuildStateMachine_Transition_Valid(t *testing.T) {
	tests := []struct {
		name    string
		from    model.BuildStatus
		to      model.BuildStatus
		wantErr bool
	}{
		{"waiting_to_pending", model.BuildStatusWaiting, model.BuildStatusPending, false},
		{"waiting_to_cancelled", model.BuildStatusWaiting, model.BuildStatusCancelled, false},
		{"pending_to_running", model.BuildStatusPending, model.BuildStatusRunning, false},
		{"pending_to_cancelled", model.BuildStatusPending, model.BuildStatusCancelled, false},
		{"running_to_successful", model.BuildStatusRunning, model.BuildStatusSuccessful, false},
		{"running_to_failed", model.BuildStatusRunning, model.BuildStatusFailed, false},
		{"running_to_cancelled", model.BuildStatusRunning, model.BuildStatusCancelled, false},
		{"running_to_timed_out", model.BuildStatusRunning, model.BuildStatusTimedOut, false},
		{"same_state", model.BuildStatusRunning, model.BuildStatusRunning, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			build := &model.Build{Status: tt.from}
			sm := NewBuildStateMachine(build)
			err := sm.Transition(tt.to)
			if (err != nil) != tt.wantErr {
				t.Errorf("Transition(%s -> %s) error = %v, wantErr = %v", tt.from, tt.to, err, tt.wantErr)
			}
			if !tt.wantErr && build.Status != tt.to {
				t.Errorf("Transition(%s -> %s): build.Status = %s, want %s", tt.from, tt.to, build.Status, tt.to)
			}
		})
	}
}

func TestBuildStateMachine_Transition_Invalid(t *testing.T) {
	tests := []struct {
		name string
		from model.BuildStatus
		to   model.BuildStatus
	}{
		{"waiting_to_running", model.BuildStatusWaiting, model.BuildStatusRunning},
		{"pending_to_successful", model.BuildStatusPending, model.BuildStatusSuccessful},
		{"successful_to_anything", model.BuildStatusSuccessful, model.BuildStatusRunning},
		{"cancelled_to_running", model.BuildStatusCancelled, model.BuildStatusRunning},
		{"failed_to_running", model.BuildStatusFailed, model.BuildStatusRunning},
		{"timed_out_to_running", model.BuildStatusTimedOut, model.BuildStatusRunning},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			build := &model.Build{Status: tt.from}
			sm := NewBuildStateMachine(build)
			err := sm.Transition(tt.to)
			if err == nil {
				t.Errorf("Transition(%s -> %s) expected error, got nil", tt.from, tt.to)
			}
			if !errors.Is(err, ErrInvalidTransition) {
				t.Errorf("Transition(%s -> %s) error = %v, want ErrInvalidTransition", tt.from, tt.to, err)
			}
		})
	}
}

func TestBuildStateMachine_IsTerminal(t *testing.T) {
	tests := []struct {
		status model.BuildStatus
		want   bool
	}{
		{model.BuildStatusWaiting, false},
		{model.BuildStatusPending, false},
		{model.BuildStatusRunning, false},
		{model.BuildStatusSuccessful, true},
		{model.BuildStatusFailed, true},
		{model.BuildStatusCancelled, true},
		{model.BuildStatusTimedOut, true},
	}

	for _, tt := range tests {
		t.Run(string(tt.status), func(t *testing.T) {
			sm := NewBuildStateMachine(&model.Build{Status: tt.status})
			if got := sm.IsTerminal(); got != tt.want {
				t.Errorf("IsTerminal(%s) = %v, want %v", tt.status, got, tt.want)
			}
		})
	}
}

func TestBuildStateMachine_IsRunning(t *testing.T) {
	sm := NewBuildStateMachine(&model.Build{Status: model.BuildStatusRunning})
	if !sm.IsRunning() {
		t.Error("IsRunning() should be true for RUNNING")
	}
	sm = NewBuildStateMachine(&model.Build{Status: model.BuildStatusPending})
	if sm.IsRunning() {
		t.Error("IsRunning() should be false for PENDING")
	}
}

func TestBuildStateMachine_CanTransition(t *testing.T) {
	sm := NewBuildStateMachine(&model.Build{Status: model.BuildStatusRunning})
	if !sm.CanTransition(model.BuildStatusSuccessful) {
		t.Error("RUNNING -> SUCCESSFUL should be valid")
	}
	if !sm.CanTransition(model.BuildStatusPending) {
		t.Error("RUNNING -> PENDING should be valid (retry)")
	}
	if sm.IsPaused() {
		t.Error("Should not be paused initially")
	}
}

func TestBuildStateMachine_NilBuild(t *testing.T) {
	sm := NewBuildStateMachine(nil)
	if sm.IsTerminal() {
		t.Error("nil build should not be terminal")
	}
	if sm.IsRunning() {
		t.Error("nil build should not be running")
	}
	if sm.CanTransition(model.BuildStatusRunning) {
		t.Error("nil build should not allow transitions")
	}
	if err := sm.Transition(model.BuildStatusRunning); err == nil {
		t.Error("nil build should return error on transition")
	}
}

// ---------------------------------------------------------------------------
// Scheduler / DAG tests
// ---------------------------------------------------------------------------

func TestBuildDAG_Empty(t *testing.T) {
	dag := BuildDAG(nil)
	if dag == nil {
		t.Fatal("BuildDAG(nil) should return empty DAG, not nil")
	}
	if !dag.AllDone() {
		t.Error("empty DAG should be AllDone")
	}
}

func TestBuildDAG_NoDependencies(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build"},
			{Name: "test"},
			{Name: "lint"},
		},
	}
	dag := BuildDAG(spec)
	if dag == nil {
		t.Fatal("BuildDAG returned nil")
	}

	ready := dag.ResolveReady()
	if len(ready) != 3 {
		t.Errorf("expected 3 ready jobs, got %d: %v", len(ready), ready)
	}
}

func TestBuildDAG_WithDependencies(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build", JobDependencies: []*buildspec.JobDependency{
				{JobName: "lint", RequireSuccessful: true},
			}},
			{Name: "test", JobDependencies: []*buildspec.JobDependency{
				{JobName: "build", RequireSuccessful: true},
			}},
			{Name: "deploy", JobDependencies: []*buildspec.JobDependency{
				{JobName: "test", RequireSuccessful: true},
			}},
			{Name: "lint"},
		},
	}
	dag := BuildDAG(spec)

	ready := dag.ResolveReady()
	if len(ready) != 1 || ready[0] != "lint" {
		t.Errorf("expected only 'lint' ready, got %v", ready)
	}

	// Mark lint as done
	newReady := dag.MarkDone("lint", true)
	if len(newReady) != 1 || newReady[0] != "build" {
		t.Errorf("expected 'build' to become ready, got %v", newReady)
	}

	// Mark build as done
	newReady = dag.MarkDone("build", true)
	if len(newReady) != 1 || newReady[0] != "test" {
		t.Errorf("expected 'test' to become ready, got %v", newReady)
	}

	// Mark test as done
	newReady = dag.MarkDone("test", true)
	if len(newReady) != 1 || newReady[0] != "deploy" {
		t.Errorf("expected 'deploy' to become ready, got %v", newReady)
	}

	if dag.AllDone() {
		t.Error("DAG should not be AllDone yet — deploy hasn't run")
	}

	_ = dag.MarkDone("deploy", true)
	if !dag.AllDone() {
		t.Error("DAG should be AllDone after deploy completes")
	}
}

func TestBuildDAG_Failure_BlocksDependents(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build", JobDependencies: []*buildspec.JobDependency{
				{JobName: "lint", RequireSuccessful: true},
			}},
			{Name: "lint"},
		},
	}
	dag := BuildDAG(spec)

	ready := dag.ResolveReady()
	if len(ready) != 1 || ready[0] != "lint" {
		t.Fatalf("expected 'lint' ready, got %v", ready)
	}

	// Lint fails
	newReady := dag.MarkDone("lint", false)
	if len(newReady) != 0 {
		t.Errorf("expected no new ready jobs on failure, got %v", newReady)
	}

	if !dag.AllDone() {
		t.Error("DAG should be AllDone after all jobs complete or fail")
	}

	failures := dag.HasFailures()
	if len(failures) != 2 {
		t.Errorf("expected 2 failures (lint + build), got %v", failures)
	}
}

func TestBuildDAG_MarkRunning(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build"},
		},
	}
	dag := BuildDAG(spec)

	if err := dag.MarkRunning("build"); err != nil {
		t.Errorf("MarkRunning should succeed for ready job: %v", err)
	}

	if err := dag.MarkRunning("build"); err == nil {
		t.Error("MarkRunning should fail for already running job")
	}

	if err := dag.MarkRunning("nonexistent"); err == nil {
		t.Error("MarkRunning should fail for nonexistent job")
	}
}

func TestBuildDAG_DuplicateDeps(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build", JobDependencies: []*buildspec.JobDependency{
				{JobName: "lint", RequireSuccessful: true},
				{JobName: "lint", RequireSuccessful: true}, // duplicate
			}},
			{Name: "lint"},
		},
	}
	dag := BuildDAG(spec)

	ready := dag.ResolveReady()
	if len(ready) != 1 || ready[0] != "lint" {
		t.Errorf("expected only 'lint' ready, got %v", ready)
	}

	_ = dag.MarkDone("lint", true)
	_ = dag.MarkDone("lint", true) // mark again — should be no-op
	if dag.AllDone() {
		t.Error("build should not be done yet")
	}
	_ = dag.MarkDone("build", true)
	if !dag.AllDone() {
		t.Error("DAG should be done after both jobs complete")
	}
}

func TestBuildDAG_StatusCount(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build", JobDependencies: []*buildspec.JobDependency{{JobName: "lint"}}},
			{Name: "lint"},
		},
	}
	dag := BuildDAG(spec)
	counts := dag.StatusCount()
	if counts[DAGPending] != 1 || counts[DAGReady] != 1 {
		t.Errorf("expected 1 pending, 1 ready; got %v", counts)
	}
}

func TestBuildDAG_String(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build"},
		},
	}
	dag := BuildDAG(spec)
	s := dag.String()
	if s == "" || s == "JobDAG{empty}" {
		t.Errorf("unexpected DAG string: %s", s)
	}
}

// ---------------------------------------------------------------------------
// Trigger match tests
// ---------------------------------------------------------------------------

func TestMatchJob_Exact(t *testing.T) {
	if !MatchJob("build", "build") {
		t.Error("exact match should work")
	}
	if MatchJob("build", "test") {
		t.Error("non-matching should return false")
	}
}

func TestMatchJob_Wildcard(t *testing.T) {
	if !MatchJob("build-linux", ":build") {
		t.Error("prefix match should work")
	}
	if !MatchJob("linux-build", "build:") {
		t.Error("suffix match should work")
	}
	if !MatchJob("build-ci", ":build:") {
		t.Error("contains match should work")
	}
}

func TestMatchJob_MultiExpr(t *testing.T) {
	if !MatchJob("test", "build,test,lint") {
		t.Error("comma-separated match should work")
	}
	if MatchJob("deploy", "build,test") {
		t.Error("non-matching in multi-expr should return false")
	}
}

func TestMatchJob_Empty(t *testing.T) {
	if !MatchJob("anything", "") {
		t.Error("empty pattern should match everything")
	}
	if !MatchJob("anything", "*") {
		t.Error("* pattern should match everything")
	}
}

func TestSkipCommit(t *testing.T) {
	tests := []struct {
		msg  string
		want bool
	}{
		{"normal commit message", false},
		{"add feature [skip ci]", true},
		{"[ci skip] urgent fix", true},
		{"[skip build] test only", true},
		{"fix [build skip]", true},
		{"fix [SKIP CI] now", true},
		{"partial [skip ci", true},
		{"", false},
	}

	for _, tt := range tests {
		name := tt.msg
		if len(name) > 20 {
			name = name[:20]
		}
		t.Run(name, func(t *testing.T) {
			if got := SkipCommit(tt.msg); got != tt.want {
				t.Errorf("SkipCommit(%q) = %v, want %v", tt.msg, got, tt.want)
			}
		})
	}
}

func TestMatchRef(t *testing.T) {
	tests := []struct {
		ref     string
		pattern string
		want    bool
	}{
		{"refs/heads/main", "main", true},
		{"refs/heads/main", "develop", false},
		{"refs/heads/release-1.0", "release-*", true},
		{"refs/heads/feature/abc", "feature/*", true},
		{"refs/heads/main", "main,develop", true},
		{"refs/heads/main", "", true},
		{"refs/tags/v1.0", "v1.0", true},
	}

	for _, tt := range tests {
		t.Run(tt.ref+"/"+tt.pattern, func(t *testing.T) {
			if got := matchRef(tt.ref, tt.pattern); got != tt.want {
				t.Errorf("matchRef(%q, %q) = %v, want %v", tt.ref, tt.pattern, got, tt.want)
			}
		})
	}
}

func TestMatchRef_EmptyRef(t *testing.T) {
	if matchRef("", "main") {
		t.Error("matching empty ref should return false")
	}
}

func TestMatchGlob(t *testing.T) {
	tests := []struct {
		path    string
		pattern string
		want    bool
	}{
		{"src/main.go", "*.go", false}, // * doesn't match /
		{"main.go", "*.go", true},
		{"src/main.go", "**", true},
		{"src/main.go", "src/*", true},
		{"src/main.go", "src/main.go", true},
		{"src/main.go", "src/*.go", true},
		{"src/main.go", "other/*", false},
	}

	for _, tt := range tests {
		t.Run(tt.path+"/"+tt.pattern, func(t *testing.T) {
			if got := matchGlob(tt.path, tt.pattern); got != tt.want {
				t.Errorf("matchGlob(%q, %q) = %v, want %v", tt.path, tt.pattern, got, tt.want)
			}
		})
	}
}

func TestEvaluateTriggers_NilSpec(t *testing.T) {
	matches := EvaluateTriggers(nil, &MatchContext{EventType: "push"})
	if matches != nil {
		t.Errorf("Expected nil matches for nil spec, got %v", matches)
	}
}

func TestEvaluateTriggers_NilContext(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "build", Triggers: buildspec.Triggers{
				&buildspec.BranchUpdateTrigger{
					TriggerBase: buildspec.TriggerBase{},
				},
			}},
		},
	}
	matches := EvaluateTriggers(spec, nil)
	if matches != nil {
		t.Errorf("Expected nil matches for nil context, got %v", matches)
	}
}

func TestEvaluateTriggers_BranchUpdate(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{
				Name: "build",
				Triggers: buildspec.Triggers{
					&buildspec.BranchUpdateTrigger{
						TriggerBase: buildspec.TriggerBase{},
					},
				},
			},
		},
	}

	ctx := &MatchContext{
		EventType: "push",
		RefName:   "refs/heads/main",
	}

	matches := EvaluateTriggers(spec, ctx)
	if len(matches) != 1 {
		t.Errorf("Expected 1 match for push event, got %d", len(matches))
	}
	if len(matches) > 0 && matches[0].JobName != "build" {
		t.Errorf("Expected job 'build' to match, got %q", matches[0].JobName)
	}
}

func TestEvaluateTriggers_NoMatch_WrongEvent(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{
				Name: "deploy",
				Triggers: buildspec.Triggers{
					&buildspec.TagCreateTrigger{
						TriggerBase: buildspec.TriggerBase{},
					},
				},
			},
		},
	}

	ctx := &MatchContext{
		EventType: "push",
		RefName:   "refs/heads/main",
	}

	matches := EvaluateTriggers(spec, ctx)
	if len(matches) != 0 {
		t.Errorf("Expected 0 matches for push event on tag trigger, got %d", len(matches))
	}
}

func TestEvaluateTriggers_PullRequest(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{
				Name: "pr-check",
				Triggers: buildspec.Triggers{
					&buildspec.PullRequestTrigger{
						TriggerBase: buildspec.TriggerBase{},
					},
				},
			},
		},
	}

	ctx := &MatchContext{
		EventType: "pr-open",
		RefName:   "refs/heads/feature",
	}

	matches := EvaluateTriggers(spec, ctx)
	if len(matches) != 1 {
		t.Errorf("Expected 1 match for PR open, got %d", len(matches))
	}
}

func TestEvaluateTriggers_NoTriggersOnJob(t *testing.T) {
	spec := &buildspec.BuildSpec{
		Jobs: []*buildspec.Job{
			{Name: "manual-job"},
		},
	}

	ctx := &MatchContext{
		EventType: "push",
		RefName:   "refs/heads/main",
	}

	matches := EvaluateTriggers(spec, ctx)
	if len(matches) != 0 {
		t.Errorf("Expected 0 matches for job with no triggers, got %d", len(matches))
	}
}

// ---------------------------------------------------------------------------
// Context tests
// ---------------------------------------------------------------------------

func TestNewJobContext(t *testing.T) {
	build := &model.Build{
		ID:         1,
		ProjectID:  10,
		Number:     42,
		JobName:    "build",
		Token:      "tok-123",
		CommitHash: "abc123",
		RefName:    "refs/heads/main",
		Status:     model.BuildStatusPending,
	}
	job := &buildspec.Job{
		Name:    "build",
		Timeout: 3600,
		ParamSpecs: buildspec.ParamSpecs{
			&buildspec.TextParam{ParamSpecBase: buildspec.ParamSpecBase{Name: "target"}},
		},
	}

	jobCtx, err := NewJobContext(build, job, "/data/projects/10")
	if err != nil {
		t.Fatalf("NewJobContext: %v", err)
	}

	if jobCtx.BuildID != 1 {
		t.Errorf("BuildID = %d, want 1", jobCtx.BuildID)
	}
	if jobCtx.BuildNumber != 42 {
		t.Errorf("BuildNumber = %d, want 42", jobCtx.BuildNumber)
	}
	if jobCtx.JobName != "build" {
		t.Errorf("JobName = %s, want build", jobCtx.JobName)
	}
	if jobCtx.JobToken != "tok-123" {
		t.Errorf("JobToken = %s, want tok-123", jobCtx.JobToken)
	}
	if jobCtx.Timeout != 3600 {
		t.Errorf("Timeout = %d, want 3600", jobCtx.Timeout)
	}
	if jobCtx.WorkDir != "/data/projects/10" {
		t.Errorf("WorkDir = %s, want /data/projects/10", jobCtx.WorkDir)
	}
	if jobCtx.EnvVars["BUILDX_BUILD_ID"] != "1" {
		t.Errorf("BUILDX_BUILD_ID = %s, want 1", jobCtx.EnvVars["BUILDX_BUILD_ID"])
	}
	if _, ok := jobCtx.ParamMap["target"]; !ok {
		t.Error("ParamMap should contain 'target'")
	}
}

func TestNewJobContextWithParams(t *testing.T) {
	build := &model.Build{
		ID:        1,
		ProjectID: 10,
		Number:    42,
		JobName:   "build",
	}
	job := &buildspec.Job{
		Name: "build",
		ParamSpecs: buildspec.ParamSpecs{
			&buildspec.TextParam{ParamSpecBase: buildspec.ParamSpecBase{Name: "target"}},
		},
	}

	ctx, err := NewJobContextWithParams(build, job, "/projects/10", map[string]string{"target": "linux"})
	if err != nil {
		t.Fatalf("NewJobContextWithParams: %v", err)
	}

	if ctx.ParamMap["target"] != "linux" {
		t.Errorf("ParamMap['target'] = %q, want 'linux'", ctx.ParamMap["target"])
	}
}

func TestNewJobContext_NilBuild(t *testing.T) {
	_, err := NewJobContext(nil, &buildspec.Job{Name: "build"}, "/dir")
	if err == nil {
		t.Error("Expected error for nil build")
	}
}

func TestNewJobContext_NilJob(t *testing.T) {
	_, err := NewJobContext(&model.Build{ID: 1}, nil, "/dir")
	if err == nil {
		t.Error("Expected error for nil job")
	}
}

func TestNewJobContext_DefaultTimeout(t *testing.T) {
	build := &model.Build{ID: 1, ProjectID: 10, JobName: "build"}
	job := &buildspec.Job{Name: "build"} // Timeout=0, should use default

	ctx, err := NewJobContext(build, job, "/dir")
	if err != nil {
		t.Fatalf("NewJobContext: %v", err)
	}
	if ctx.Timeout != buildspec.DefaultTimeout {
		t.Errorf("Timeout = %d, want DefaultTimeout (%d)", ctx.Timeout, buildspec.DefaultTimeout)
	}
}

// ---------------------------------------------------------------------------
// Log buffer tests
// ---------------------------------------------------------------------------

func TestLogBuffer_AppendAndEntries(t *testing.T) {
	lb := NewLogBuffer(1, 100)

	lb.Append(LogEntry{Level: "info", Message: "hello", Timestamp: time.Now()})
	lb.Append(LogEntry{Level: "stdout", Message: "world", Timestamp: time.Now()})

	entries := lb.Entries()
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Message != "hello" {
		t.Errorf("entry[0].Message = %q, want 'hello'", entries[0].Message)
	}
	if entries[0].BuildID != 1 {
		t.Errorf("entry[0].BuildID = %d, want 1", entries[0].BuildID)
	}
}

func TestLogBuffer_RingBuffer(t *testing.T) {
	lb := NewLogBuffer(1, 3)

	lb.Append(LogEntry{Message: "a"})
	lb.Append(LogEntry{Message: "b"})
	lb.Append(LogEntry{Message: "c"})
	lb.Append(LogEntry{Message: "d"}) // should evict "a"

	entries := lb.Entries()
	if len(entries) != 3 {
		t.Fatalf("expected 3 entries (capacity), got %d", len(entries))
	}
	if entries[0].Message != "b" {
		t.Errorf("first entry should be 'b' after evicting 'a', got %q", entries[0].Message)
	}
}

func TestLogBuffer_Subscribe(t *testing.T) {
	lb := NewLogBuffer(1, 100)
	ch := lb.Subscribe()
	defer lb.Unsubscribe(ch)

	lb.Append(LogEntry{Message: "live"})

	select {
	case entry := <-ch:
		if entry.Message != "live" {
			t.Errorf("received message = %q, want 'live'", entry.Message)
		}
	case <-time.After(time.Second):
		t.Fatal("timed out waiting for log entry")
	}
}

func TestLogBuffer_SubscribeSlowConsumer(t *testing.T) {
	lb := NewLogBuffer(1, 100)
	ch := lb.Subscribe()
	defer lb.Unsubscribe(ch)

	// Fill the channel buffer (256) plus some extra to test non-blocking send
	for i := 0; i < 300; i++ {
		lb.Append(LogEntry{Message: "entry"})
	}

	// The buffer should still have entries (even if some were dropped for slow consumer)
	entries := lb.Entries()
	if len(entries) == 0 {
		t.Error("buffer should have entries even with slow consumer")
	}

	// Drain the subscriber channel
	done := make(chan struct{})
	go func() {
		for range ch {
		}
		close(done)
	}()
	lb.Close()
	<-done
}

func TestLogBuffer_Close(t *testing.T) {
	lb := NewLogBuffer(1, 100)
	ch := lb.Subscribe()

	lb.Close()

	// Append after close should be a no-op
	lb.Append(LogEntry{Message: "after-close"})
	entries := lb.Entries()
	if len(entries) != 0 {
		t.Errorf("expected 0 entries after close, got %d", len(entries))
	}

	// Channel should be closed
	_, ok := <-ch
	if ok {
		t.Error("subscriber channel should be closed after Close()")
	}
}

func TestLogBuffer_ConcurrentAccess(t *testing.T) {
	lb := NewLogBuffer(1, 1000)
	var wg sync.WaitGroup

	// Concurrent writers
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				lb.Append(LogEntry{Message: "msg", Level: "info"})
			}
		}(i)
	}

	// Concurrent readers
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 50; j++ {
				_ = lb.Entries()
			}
		}()
	}

	wg.Wait()

	entries := lb.Entries()
	if len(entries) == 0 {
		t.Error("expected entries after concurrent access")
	}
}

// ---------------------------------------------------------------------------
// SubmitRequest validation
// ---------------------------------------------------------------------------

func TestSubmitRequest_Validate(t *testing.T) {
	// Just verify the type can be constructed
	req := SubmitRequest{
		ProjectID:   1,
		JobName:     "build",
		CommitHash:  "abc123",
		RefName:     "refs/heads/main",
		Reason:      "Manual trigger",
		SubmitterID: 1,
	}
	if req.JobName == "" {
		t.Error("JobName should not be empty")
	}
	if req.SubmitterID == 0 {
		t.Error("SubmitterID should not be 0")
	}
}

// ---------------------------------------------------------------------------
// RunningJob type
// ---------------------------------------------------------------------------

func TestRunningJob_Type(t *testing.T) {
	_, cancel := context.WithCancel(context.Background())
	defer cancel()

	rj := &RunningJob{
		BuildID:    1,
		JobToken:   "token-1",
		StartTime:  time.Now(),
		CancelFunc: cancel,
		Logger:     executor.NewBuildLogger(1),
	}

	if rj.BuildID != 1 {
		t.Errorf("BuildID = %d, want 1", rj.BuildID)
	}
	if rj.JobToken != "token-1" {
		t.Errorf("JobToken = %s, want token-1", rj.JobToken)
	}
}
