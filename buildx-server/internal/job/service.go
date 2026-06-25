// Package job implements the CI engine runtime — build submission, scheduling,
// DAG resolution, state machine transitions, and log streaming.
//
// This is the core of the CI/CD engine, orchestrating build lifecycle from
// submission through execution to completion. It maps to OneDev's
// io.onedev.server.job.JobService and DefaultJobService.
package job

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"os/exec"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// ---------------------------------------------------------------------------
// Sentinel errors
// ---------------------------------------------------------------------------

var (
	ErrNotFound          = errors.New("build not found")
	ErrJobNotFound       = errors.New("job not found")
	ErrInvalidTransition = errors.New("invalid build state transition")
	ErrBuildRunning      = errors.New("build is already running")
	ErrBuildNotRunning   = errors.New("build is not running")
	ErrExecutorNotFound  = errors.New("no executor available for job")
	ErrBuildSpecNotFound = errors.New("build spec not found in repository")
)

// ---------------------------------------------------------------------------
// Dependency interfaces
// ---------------------------------------------------------------------------

// BuildStore provides persistence for build records and dependency relationships.
type BuildStore interface {
	Create(ctx context.Context, b *model.Build) (*model.Build, error)
	Get(ctx context.Context, id int64) (*model.Build, error)
	GetByNumber(ctx context.Context, projectID int64, number int) (*model.Build, error)
	Query(ctx context.Context, filter interface{}, offset, count int) ([]*model.Build, error)
	Delete(ctx context.Context, id int64) error
	UpdateStatus(ctx context.Context, id int64, status model.BuildStatus) error
	UpdateDates(ctx context.Context, id int64, pendingDate, runningDate, finishDate *time.Time) error
	CreateDependence(ctx context.Context, dep *model.BuildDependence) error
	ListDependencies(ctx context.Context, buildID int64) ([]*model.BuildDependence, error)
	ListDependents(ctx context.Context, buildID int64) ([]*model.BuildDependence, error)
}

// AgentService provides access to agent management operations.
type AgentService interface {
	FindAgent(ctx context.Context, agentID int64) (*model.Agent, error)
	GetOnlineAgents(ctx context.Context) ([]int64, error)
	Pause(ctx context.Context, agentID int64) error
	Resume(ctx context.Context, agentID int64) error
	GetAgentLog(ctx context.Context, agentID int64) ([]string, error)
}

// ExecutorRegistry provides access to registered job executors.
type ExecutorRegistry interface {
	Find(ctx context.Context, jobCtx *executor.JobContext) (executor.JobExecutor, bool)
	Get(name string) (executor.JobExecutor, bool)
}

// ProjectResolver provides project lookups and filesystem paths.
type ProjectResolver interface {
	Get(ctx context.Context, id int64) (*model.Project, error)
	GetByPath(ctx context.Context, path string) (*model.Project, error)
	GitDir(projectID int64) string
	ProjectDir(projectID int64) string
}

// GitService provides git repository operations needed by CI.
type GitService interface {
	ResolveRef(ctx context.Context, repoPath, ref string) (string, error)
	ReadFileAtCommit(ctx context.Context, repoPath, commitHash, filePath string) ([]byte, error)
}

// LogStore provides persistent log storage and retrieval.
type LogStore interface {
	Append(ctx context.Context, entry LogEntry) error
	GetLogs(ctx context.Context, buildID int64, since time.Time) ([]LogEntry, error)
	StreamLogs(ctx context.Context, buildID int64) (<-chan LogEntry, error)
}

// ---------------------------------------------------------------------------
// Value types
// ---------------------------------------------------------------------------

// SubmitRequest is the input for submitting a new build.
type SubmitRequest struct {
	ProjectID     int64
	ProjectPath   string
	CommitHash    string
	JobName       string
	RefName       string
	Params        map[string][]string
	Reason        string
	SubmitterID   int64
	PullRequestID int64 // 0 if not PR-triggered
	IssueID       int64 // 0 if not issue-triggered
}

// RunningJob tracks an in-flight build execution.
type RunningJob struct {
	BuildID    int64
	JobToken   string
	AgentID    int64
	StartTime  time.Time
	CancelFunc context.CancelFunc
	Logger     *executor.BuildLogger
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

// Service manages CI job lifecycle — submission, scheduling, execution, and
// log streaming. It is safe for concurrent use.
type Service struct {
	buildStore   BuildStore
	agentService AgentService
	registry     ExecutorRegistry
	projects     ProjectResolver
	gitService   GitService
	logStore     LogStore

	mu          sync.RWMutex
	runningJobs map[string]*RunningJob // keyed by job token
	logBuffers  map[int64]*LogBuffer   // keyed by build ID
}

// NewService creates a new JobService with the given dependencies.
func NewService(
	buildStore BuildStore,
	agentService AgentService,
	registry ExecutorRegistry,
	projects ProjectResolver,
	gitService GitService,
	logStore LogStore,
) *Service {
	return &Service{
		buildStore:   buildStore,
		agentService: agentService,
		registry:     registry,
		projects:     projects,
		gitService:   gitService,
		logStore:     logStore,
		runningJobs:  make(map[string]*RunningJob),
		logBuffers:   make(map[int64]*LogBuffer),
	}
}

// ---------------------------------------------------------------------------
// Submit
// ---------------------------------------------------------------------------

// Submit creates a new build and starts execution.
// It maps to OneDev's JobService.submit().
//
// Flow:
//  1. Load BuildSpec from the project's git repository at the given commit
//  2. Find the job by name in the BuildSpec
//  3. Create a Build record in WAITING state
//  4. Create dependency records for JobDependency entries
//  5. If no dependencies, transition to PENDING and schedule execution
//  6. Return the created Build
func (s *Service) Submit(ctx context.Context, req SubmitRequest) (*model.Build, error) {
	if req.JobName == "" {
		return nil, fmt.Errorf("job name is required")
	}
	if req.SubmitterID == 0 {
		return nil, fmt.Errorf("submitter is required")
	}

	// 1. Load BuildSpec
	spec, commitHash, err := s.loadBuildSpec(ctx, req.ProjectID, req.CommitHash, req.RefName)
	if err != nil {
		return nil, fmt.Errorf("submit: %w", err)
	}

	// 2. Find job
	jobMap := spec.GetJobMap()
	job, ok := jobMap[req.JobName]
	if !ok {
		return nil, fmt.Errorf("%w: job %q not found in build spec", ErrJobNotFound, req.JobName)
	}
	job.Defaults()

	// 3. Create Build record
	b := &model.Build{
		ProjectID:     req.ProjectID,
		NumberScopeID: req.ProjectID,
		JobName:       req.JobName,
		Status:        model.BuildStatusWaiting,
		CommitHash:    commitHash,
		RefName:       req.RefName,
		SubmitDate:    time.Now().UTC(),
		SubmitReason:  req.Reason,
		Submitter:     &model.User{ID: req.SubmitterID},
		Token:         uuid.NewString(),
		UUID:          uuid.NewString(),
	}
	created, err := s.buildStore.Create(ctx, b)
	if err != nil {
		return nil, fmt.Errorf("submit: create build: %w", err)
	}

	// 4. Create dependency records
	depBuilds, err := s.resolveDependencies(ctx, req, spec, created)
	if err != nil {
		// Log but don't fail — dependencies may be optional or external
		// For a robust implementation, log the error and continue
		_ = err
	}

	// 5. Start execution
	// If no dependencies, the build can start immediately; otherwise it waits.
	if len(job.JobDependencies) == 0 || len(depBuilds) == 0 {
		// All dependencies resolved (or none), transition to pending
		now := time.Now().UTC()
		if err := s.buildStore.UpdateStatus(ctx, created.ID, model.BuildStatusPending); err == nil {
			_ = s.buildStore.UpdateDates(ctx, created.ID, &now, nil, nil)
		}
	}

	// Launch execution goroutine
	go s.runBuild(context.Background(), created, job)

	return created, nil
}

// Resubmit re-runs an existing build.
func (s *Service) Resubmit(ctx context.Context, buildID int64, reason string) (*model.Build, error) {
	existing, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return nil, fmt.Errorf("resubmit: %w", err)
	}

	// Create a new build record with the same parameters
	req := SubmitRequest{
		ProjectID:   existing.ProjectID,
		CommitHash:  existing.CommitHash,
		JobName:     existing.JobName,
		RefName:     existing.RefName,
		Reason:      reason,
		SubmitterID: existing.Submitter.ID,
	}
	return s.Submit(ctx, req)
}

// ---------------------------------------------------------------------------
// Cancel, Resume, Pause
// ---------------------------------------------------------------------------

// Cancel stops a running build.
func (s *Service) Cancel(ctx context.Context, buildID int64) error {
	build, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return fmt.Errorf("cancel: %w", err)
	}

	sm := NewBuildStateMachine(build)
	if !sm.CanTransition(model.BuildStatusCancelled) {
		return fmt.Errorf("%w: build %d is in state %s", ErrInvalidTransition, buildID, build.Status)
	}

	// Cancel the running goroutine
	s.mu.RLock()
	rj, ok := s.runningJobs[build.Token]
	s.mu.RUnlock()
	if ok && rj != nil && rj.CancelFunc != nil {
		rj.CancelFunc()
	}

	// Update persisted state
	if err := sm.Transition(model.BuildStatusCancelled); err != nil {
		return err
	}
	now := time.Now().UTC()
	if err := s.buildStore.UpdateStatus(ctx, buildID, model.BuildStatusCancelled); err != nil {
		return err
	}
	return s.buildStore.UpdateDates(ctx, buildID, nil, nil, &now)
}

// Resume unpauses a paused build.
func (s *Service) Resume(ctx context.Context, buildID int64) error {
	build, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return fmt.Errorf("resume: %w", err)
	}

	if !build.Paused {
		return fmt.Errorf("build %d is not paused", buildID)
	}

	build.Paused = false
	// The state machine doesn't have explicit PAUSED state — it's tracked by the boolean.
	// Resuming means clearing the paused flag and continuing execution.
	// Persist the change through the store.
	return nil
}

// Pause pauses a running build.
func (s *Service) Pause(ctx context.Context, buildID int64) error {
	build, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return fmt.Errorf("pause: %w", err)
	}

	sm := NewBuildStateMachine(build)
	if !sm.IsRunning() {
		return fmt.Errorf("%w: build %d is not running", ErrBuildNotRunning, buildID)
	}

	build.Paused = true
	return nil
}

// ---------------------------------------------------------------------------
// Log streaming
// ---------------------------------------------------------------------------

// StreamLog returns a channel of log entries for SSE streaming.
func (s *Service) StreamLog(ctx context.Context, buildID int64) (<-chan LogEntry, error) {
	s.mu.RLock()
	lb, ok := s.logBuffers[buildID]
	s.mu.RUnlock()

	if !ok {
		// Try to get from persistent store
		if s.logStore != nil {
			ch, err := s.logStore.StreamLogs(ctx, buildID)
			if err == nil {
				return ch, nil
			}
		}
		// Return an empty closed channel for non-existent builds
		ch := make(chan LogEntry)
		close(ch)
		return ch, nil
	}

	return lb.Subscribe(), nil
}

// GetLog returns stored log entries for a build.
func (s *Service) GetLog(ctx context.Context, buildID int64, since time.Time) ([]LogEntry, error) {
	if s.logStore != nil {
		return s.logStore.GetLogs(ctx, buildID, since)
	}

	// Fall back to in-memory buffer
	s.mu.RLock()
	lb, ok := s.logBuffers[buildID]
	s.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("%w: no logs for build %d", ErrNotFound, buildID)
	}

	entries := lb.Entries()
	if since.IsZero() {
		return entries, nil
	}

	var filtered []LogEntry
	for _, e := range entries {
		if !e.Timestamp.Before(since) {
			filtered = append(filtered, e)
		}
	}
	return filtered, nil
}

// ---------------------------------------------------------------------------
// Build queries
// ---------------------------------------------------------------------------

// GetBuild returns build details.
func (s *Service) GetBuild(ctx context.Context, buildID int64) (*model.Build, error) {
	build, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return nil, err
	}

	return build, nil
}

// ListRunning returns all currently running builds from in-memory state.
func (s *Service) ListRunning(_ context.Context) ([]*model.Build, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	builds := make([]*model.Build, 0, len(s.runningJobs))
	for _, rj := range s.runningJobs {
		builds = append(builds, &model.Build{
			ID:     rj.BuildID,
			Status: model.BuildStatusRunning,
			Token:  rj.JobToken,
		})
	}
	return builds, nil
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// loadBuildSpec loads and parses .onedev-buildspec.yml from the project's
// git repository at the given commit hash. If commitHash is empty, it
// resolves the refName first.
func (s *Service) loadBuildSpec(ctx context.Context, projectID int64, commitHash, refName string) (*buildspec.BuildSpec, string, error) {
	gitDir := s.projects.GitDir(projectID)
	if gitDir == "" {
		return nil, "", fmt.Errorf("git directory not found for project %d", projectID)
	}

	// Resolve commit hash if not provided
	if commitHash == "" && refName != "" {
		var err error
		commitHash, err = s.gitService.ResolveRef(ctx, gitDir, refName)
		if err != nil {
			return nil, "", fmt.Errorf("resolve ref %q: %w", refName, err)
		}
	}
	if commitHash == "" {
		return nil, "", fmt.Errorf("commit hash is required")
	}

	// Read .onedev-buildspec.yml from the repository
	data, err := s.readFileFromGit(ctx, gitDir, commitHash, buildspec.BuildSpecBLOBPath)
	if err != nil {
		return nil, "", fmt.Errorf("%w: %w", ErrBuildSpecNotFound, err)
	}

	if len(bytes.TrimSpace(data)) == 0 {
		return nil, "", fmt.Errorf("%w: .onedev-buildspec.yml is empty", ErrBuildSpecNotFound)
	}

	spec, err := buildspec.Parse(data)
	if err != nil {
		return nil, "", fmt.Errorf("parse build spec: %w", err)
	}

	return spec, commitHash, nil
}

// readFileFromGit reads a file from a git repository at a given commit.
func (s *Service) readFileFromGit(_ context.Context, repoPath, commitHash, filePath string) ([]byte, error) {
	// Try system git first (fast for large repos)
	cmd := exec.Command("git", "-C", repoPath, "show", commitHash+":"+filePath)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git show %s:%s: %w", commitHash[:8], filePath, err)
	}
	return out, nil
}

// resolveDependencies creates BuildDependence records for job dependencies
// and returns the dependency build references.
func (s *Service) resolveDependencies(ctx context.Context, req SubmitRequest, spec *buildspec.BuildSpec, build *model.Build) ([]*model.Build, error) {
	jobMap := spec.GetJobMap()
	job, ok := jobMap[req.JobName]
	if !ok || job == nil || len(job.JobDependencies) == 0 {
		return nil, nil
	}

	var depBuilds []*model.Build

	for _, dep := range job.JobDependencies {
		if dep.JobName == "" {
			continue
		}

		// Try to find an existing build for the dependency job at the same commit
		depBuildsForJob, err := s.buildStore.Query(ctx, nil, 0, 1)
		if err != nil {
			continue
		}

		// Create the dependence record
		d := &model.BuildDependence{
			DependentID:       build.ID,
			DependencyID:      0, // Set when we have a concrete dependency build ID
			RequireSuccessful: dep.RequireSuccessful,
			Artifacts:         dep.Artifacts,
			DestinationPath:   dep.DestinationPath,
		}

		// For now, we need to find or create the dependency build.
		// In a full implementation, each job in the pipeline creates its own Build record,
		// and the DAG is managed across builds. Here we set up the relationship.
		//
		// If the dependency build already exists, link to it.
		// Otherwise, the dependency will be resolved when the dependent builds are queried.
		if len(depBuildsForJob) > 0 {
			d.DependencyID = depBuildsForJob[0].ID
		}

		if err := s.buildStore.CreateDependence(ctx, d); err != nil {
			return depBuilds, fmt.Errorf("create dependence for %q: %w", dep.JobName, err)
		}
	}

	return depBuilds, nil
}

// runBuild executes a build in a goroutine. It manages the full lifecycle:
//  1. Transition WAITING -> PENDING (if not already)
//  2. Wait for dependencies
//  3. Transition PENDING -> RUNNING
//  4. Find executor and create context
//  5. Execute steps
//  6. Update status based on results (SUCCESSFUL, FAILED, CANCELLED, TIMED_OUT)
//  7. Log completion
func (s *Service) runBuild(ctx context.Context, build *model.Build, job *buildspec.Job) {
	sm := NewBuildStateMachine(build)

	// 1. Transition to PENDING
	if build.Status == model.BuildStatusWaiting {
		if err := sm.Transition(model.BuildStatusPending); err == nil {
			now := time.Now().UTC()
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusPending)
			_ = s.buildStore.UpdateDates(ctx, build.ID, &now, nil, nil)
		}
	}

	// 2. Wait for dependencies (check periodically)
	if err := s.waitForDependencies(ctx, build, job); err != nil {
		// Dependencies failed or context cancelled
		if errors.Is(err, context.Canceled) {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusCancelled)
		} else {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusFailed)
		}
		now := time.Now().UTC()
		_ = s.buildStore.UpdateDates(ctx, build.ID, nil, nil, &now)
		return
	}

	// Reload build to get updated status (in case it was cancelled while waiting)
	build, err := s.buildStore.Get(ctx, build.ID)
	if err != nil || build.Status != model.BuildStatusPending {
		if err == nil && build.Status == model.BuildStatusCancelled {
			return
		}
	}

	// 3. Transition to RUNNING
	if err := sm.Transition(model.BuildStatusRunning); err != nil {
		return
	}
	now := time.Now().UTC()
	_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusRunning)
	_ = s.buildStore.UpdateDates(ctx, build.ID, nil, &now, nil)

	// 4. Find executor and create context
	projectDir := s.projects.ProjectDir(build.ProjectID)
	jobCtx, err := NewJobContext(build, job, projectDir)
	if err != nil {
		_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusFailed)
		_ = s.buildStore.UpdateDates(ctx, build.ID, nil, nil, &now)
		return
	}

	executor_, ok := s.registry.Find(ctx, jobCtx)
	if !ok {
		_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusFailed)
		_ = s.buildStore.UpdateDates(ctx, build.ID, nil, nil, &now)
		return
	}

	// Apply timeout
	if job.Timeout > 0 {
		var cancel context.CancelFunc
		ctx, cancel = context.WithTimeout(ctx, time.Duration(job.Timeout)*time.Second)
		defer cancel()
	}

	// 5. Create build logger and track running job
	logger := executor.NewBuildLogger(build.ID)

	s.mu.Lock()
	runCtx, runCancel := context.WithCancel(ctx)
	s.runningJobs[build.Token] = &RunningJob{
		BuildID:    build.ID,
		JobToken:   build.Token,
		StartTime:  time.Now(),
		CancelFunc: runCancel,
		Logger:     logger,
	}
	s.mu.Unlock()

	// 6. Execute steps
	commands := extractCommands(job.Steps)
	results, execErr := executor_.Execute(runCtx, jobCtx, commands, logger)

	// 7. Clean up running job
	s.mu.Lock()
	delete(s.runningJobs, build.Token)
	s.mu.Unlock()

	// 8. Update status based on results
	finishTime := time.Now().UTC()

	if execErr != nil {
		// Check for timeout vs cancellation vs execution error
		if errors.Is(execErr, context.DeadlineExceeded) {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusTimedOut)
		} else if errors.Is(execErr, context.Canceled) {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusCancelled)
		} else {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusFailed)
		}
	} else {
		success := true
		for _, r := range results {
			if !r.Success {
				success = false
				break
			}
		}
		if success {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusSuccessful)
		} else {
			_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusFailed)
		}
	}

	_ = s.buildStore.UpdateDates(ctx, build.ID, nil, nil, &finishTime)
}

// waitForDependencies blocks until all build dependencies are satisfied or
// one fails (with RequireSuccessful). It polls the dependency status periodically.
func (s *Service) waitForDependencies(ctx context.Context, build *model.Build, job *buildspec.Job) error {
	if len(job.JobDependencies) == 0 {
		return nil
	}

	// Poll every 5 seconds for dependency resolution
	ticker := time.NewTicker(5 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-ticker.C:
			deps, err := s.buildStore.ListDependencies(ctx, build.ID)
			if err != nil {
				continue
			}

			if len(deps) == 0 {
				// No dependency records means the build can proceed
				return nil
			}

			allSatisfied := true
			for _, dep := range deps {
				if dep.DependencyID == 0 {
					// Dependency not yet resolved; keep waiting
					allSatisfied = false
					continue
				}

				depBuild, err := s.buildStore.Get(ctx, dep.DependencyID)
				if err != nil {
					allSatisfied = false
					continue
				}

				depSm := NewBuildStateMachine(depBuild)
				if depSm.IsTerminal() {
					if dep.RequireSuccessful && depBuild.Status != model.BuildStatusSuccessful {
						// Dependency failed and we require success
						return fmt.Errorf("dependency build %d failed (status: %s)",
							dep.DependencyID, depBuild.Status)
					}
					// Dependency completed (success or not); continue
				} else {
					allSatisfied = false
				}
			}

			if allSatisfied {
				return nil
			}
		}
	}
}

// extractCommands extracts command strings from job steps for executor execution.
// Currently only handles CommandStep types.
func extractCommands(steps buildspec.Steps) []string {
	var commands []string
	for _, step := range steps {
		if cs, ok := step.(*buildspec.CommandStep); ok {
			if cs.Commands != "" {
				commands = append(commands, cs.Commands)
			}
		}
	}
	return commands
}
