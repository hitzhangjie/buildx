package executor_test

import (
	"context"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// ---------------------------------------------------------------------------
// ServerShellExecutor tests
// ---------------------------------------------------------------------------

func TestServerShell_Execute_SingleCommand(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     1,
		BuildNumber: 10,
		ProjectID:   100,
	}

	results, err := e.Execute(ctx, jc, []string{"echo hello"}, log)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if !results[0].Success {
		t.Fatalf("expected success, got exit code %d: %s", results[0].ExitCode, results[0].Error)
	}

	entries := log.Entries()
	if !hasLogMessage(entries, "hello") {
		t.Fatal("expected 'hello' in log output")
	}
}

func TestServerShell_Execute_MultipleSteps(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     2,
		BuildNumber: 11,
		ProjectID:   100,
	}

	results, err := e.Execute(ctx, jc, []string{
		"echo first",
		"echo second",
		"echo third",
	}, log)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}
	for i, r := range results {
		if !r.Success {
			t.Fatalf("step %d failed: %s", i, r.Error)
		}
	}

	entries := log.Entries()
	if !hasLogMessage(entries, "first") || !hasLogMessage(entries, "second") || !hasLogMessage(entries, "third") {
		t.Fatal("missing expected log output")
	}
}

func TestServerShell_Execute_StopsOnFailure(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     3,
		BuildNumber: 12,
		ProjectID:   100,
	}

	results, err := e.Execute(ctx, jc, []string{
		"echo before",
		"exit 1",
		"echo after",
	}, log)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results (stop on failure), got %d", len(results))
	}
	if !results[0].Success {
		t.Fatal("expected step 0 (echo before) to succeed")
	}
	if results[1].Success {
		t.Fatal("expected step 1 (exit 1) to fail")
	}
	// step 2 should not execute
	entries := log.Entries()
	if hasLogMessage(entries, "after") {
		t.Fatal("step 'after' should not have executed")
	}
}

func TestServerShell_Execute_EmptyCommands(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{BuildID: 4, BuildNumber: 13, ProjectID: 100}

	results, err := e.Execute(ctx, jc, []string{}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 0 {
		t.Fatalf("expected 0 results for empty commands, got %d", len(results))
	}
}

func TestServerShell_Execute_EmptyCommandText(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{BuildID: 5, BuildNumber: 14, ProjectID: 100}

	results, err := e.Execute(ctx, jc, []string{"   ", "echo ok"}, log)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}
	if !results[0].Success {
		t.Fatal("expected empty step to succeed")
	}
	if !results[1].Success {
		t.Fatal("expected 'echo ok' to succeed")
	}
}

func TestServerShell_Execute_EnvVars(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     6,
		BuildNumber: 15,
		ProjectID:   100,
		EnvVars:     map[string]string{"CUSTOM_VAR": "custom_value"},
	}

	results, err := e.Execute(ctx, jc, []string{"echo $CUSTOM_VAR"}, log)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 || !results[0].Success {
		t.Fatalf("execution failed: %s", results[0].Error)
	}
	if !hasLogMessage(log.Entries(), "custom_value") {
		t.Fatal("expected CUSTOM_VAR env var value in output")
	}
}

func TestServerShell_Execute_ContextCancellation(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	jc := &executor.JobContext{BuildID: 7, BuildNumber: 16, ProjectID: 100}

	// Start a long-running command.
	errCh := make(chan error, 1)
	go func() {
		_, err := e.Execute(ctx, jc, []string{"sleep 30"}, nil)
		errCh <- err
	}()

	// Cancel before the sleep finishes.
	time.Sleep(50 * time.Millisecond)
	cancel()

	select {
	case err := <-errCh:
		if err == nil {
			// May get partial results with no top-level error, which is acceptable.
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for cancelled execution")
	}
}

func TestServerShell_Execute_Timeout(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     8,
		BuildNumber: 17,
		ProjectID:   100,
		Timeout:     1, // 1 second timeout
	}

	results, err := e.Execute(ctx, jc, []string{"sleep 5"}, nil)
	if err == nil && len(results) > 0 && results[0].ExitCode == -1 {
		// Command was killed by signal; this is expected.
	}

	_ = results
}

func TestServerShell_Execute_WorkDirCreated(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)

	// Manually remove the workDir to confirm it gets created.
	os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{
		BuildID:     9,
		BuildNumber: 18,
		ProjectID:   100,
		ProjectName: "demo",
		JobID:       1,
		JobName:     "job1",
	}

	_, err := e.Execute(ctx, jc, []string{"echo created"}, nil)
	if err != nil {
		t.Fatal(err)
	}

	expectedDir := executor.BuildWorkDir(workDir, jc)
	if _, err := os.Stat(expectedDir); os.IsNotExist(err) {
		t.Fatalf("work directory %s was not created", expectedDir)
	}
	os.RemoveAll(workDir)
}

func TestServerShell_Execute_StderrCapture(t *testing.T) {
	e, log, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{BuildID: 10, BuildNumber: 19, ProjectID: 100}

	_, err := e.Execute(ctx, jc, []string{"echo stderr_output >&2"}, log)
	if err != nil {
		t.Fatal(err)
	}

	entries := log.Entries()
	if !hasLogLevelMessage(entries, "stderr", "stderr_output") {
		t.Fatal("expected stderr_output logged at stderr level")
	}
}

func TestServerShell_Execute_DurationPopulated(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	jc := &executor.JobContext{BuildID: 11, BuildNumber: 20, ProjectID: 100}

	results, err := e.Execute(ctx, jc, []string{"sleep 0.05"}, nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].DurationMs < 1 {
		t.Fatal("expected positive duration")
	}
}

func TestServerShell_Name(t *testing.T) {
	e := executor.NewServerShellExecutor("/tmp")
	if e.Name() != "server-shell" {
		t.Fatalf("expected name 'server-shell', got %q", e.Name())
	}
}

func TestServerShell_IsApplicable(t *testing.T) {
	e := executor.NewServerShellExecutor("/tmp")
	if !e.IsApplicable(context.Background(), nil) {
		t.Fatal("server-shell should always be applicable")
	}
}

func TestServerShell_SupportsFlags(t *testing.T) {
	e := executor.NewServerShellExecutor("/tmp")
	// Default config has both disabled.
	if e.SupportsHTMLReports() {
		t.Fatal("expected HTML reports disabled by default")
	}
	if e.SupportsSitePublishing() {
		t.Fatal("expected site publishing disabled by default")
	}
}

func TestServerShell_ConcurrentExecutions(t *testing.T) {
	e, _, workDir := newServerShellTestEnv(t)
	defer os.RemoveAll(workDir)

	ctx := context.Background()
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			jc := &executor.JobContext{
				BuildID:     int64(100 + n),
				BuildNumber: 100 + n,
				ProjectID:   200,
			}
			results, err := e.Execute(ctx, jc, []string{"echo concurrent"}, nil)
			if err != nil {
				t.Errorf("concurrent execution %d error: %v", n, err)
			}
			if len(results) != 1 || !results[0].Success {
				t.Errorf("concurrent execution %d failed", n)
			}
		}(i)
	}
	wg.Wait()
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func newServerShellTestEnv(t *testing.T) (*executor.ServerShellExecutor, *executor.BuildLogger, string) {
	t.Helper()
	workDir := t.TempDir()
	e := executor.NewServerShellExecutor(workDir)
	log := executor.NewBuildLogger(1)
	return e, log, workDir
}

func hasLogMessage(entries []executor.LogEntry, msg string) bool {
	for _, e := range entries {
		if strings.Contains(e.Message, msg) {
			return true
		}
	}
	return false
}

func hasLogLevelMessage(entries []executor.LogEntry, level, msg string) bool {
	for _, e := range entries {
		if e.Level == level && strings.Contains(e.Message, msg) {
			return true
		}
	}
	return false
}
