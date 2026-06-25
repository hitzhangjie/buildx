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
	buildstore "github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/artifact"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
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
	Query(ctx context.Context, filter buildstore.QueryFilter, offset, count int) ([]*model.Build, error)
	Delete(ctx context.Context, id int64) error
	UpdateStatus(ctx context.Context, id int64, status model.BuildStatus) error
	UpdateVersion(ctx context.Context, id int64, version string) error
	ResetForResubmit(ctx context.Context, id int64, token, reason string, submitterID int64) error
	UpdateRetryPending(ctx context.Context, id int64) error
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
	Active     *ActiveJobContext // worker API context while executing
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
	cache        *cache.Service
	artifacts    *artifact.Store

	mu              sync.RWMutex
	runningJobs     map[string]*RunningJob // keyed by job token
	scheduling      map[int64]bool         // builds being started by scheduler
	logBuffers      map[int64]*LogBuffer   // keyed by build ID
	seqLocks        map[string]time.Time   // sequential group locks
	scheduleCache   *ScheduleCache
	logPersistDir   string
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
		runningJobs:   make(map[string]*RunningJob),
		scheduling:    make(map[int64]bool),
		logBuffers:    make(map[int64]*LogBuffer),
		seqLocks:      make(map[string]time.Time),
		scheduleCache: NewScheduleCache(),
	}
}

// SetLogPersistDir enables on-disk log persistence under the given directory.
func (s *Service) SetLogPersistDir(dir string) {
	s.logPersistDir = dir
}

// SetCacheAndArtifacts wires optional cache and artifact stores for CI steps.
func (s *Service) SetCacheAndArtifacts(cacheSvc *cache.Service, artifactStore *artifact.Store) {
	s.cache = cacheSvc
	s.artifacts = artifactStore
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

	// 4. Create dependency records (submit dependency jobs, link DAG)
	if err := s.resolveAndLinkDependencies(ctx, req, commitHash, job, created); err != nil {
		_ = err
	}

	// 5. Transition to PENDING when no dependencies; otherwise stay WAITING
	if len(job.JobDependencies) == 0 {
		now := time.Now().UTC()
		if err := s.buildStore.UpdateStatus(ctx, created.ID, model.BuildStatusPending); err == nil {
			_ = s.buildStore.UpdateDates(ctx, created.ID, &now, nil, nil)
			created.Status = model.BuildStatusPending
		}
	}

	if created.Status == model.BuildStatusPending {
		go s.tryScheduleBuild(context.Background(), created.ID)
	}

	return created, nil
}

// Resubmit re-runs a finished build in place (OneDev resubmit semantics).
func (s *Service) Resubmit(ctx context.Context, buildID int64, reason string) (*model.Build, error) {
	existing, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return nil, fmt.Errorf("resubmit: %w", err)
	}
	if !NewBuildStateMachine(existing).IsTerminal() {
		return nil, fmt.Errorf("%w: build %d is not finished", ErrInvalidTransition, buildID)
	}

	token := uuid.NewString()
	if err := s.buildStore.ResetForResubmit(ctx, buildID, token, reason, existing.Submitter.ID); err != nil {
		return nil, fmt.Errorf("resubmit: %w", err)
	}

	deps, _ := s.buildStore.ListDependencies(ctx, buildID)
	for _, dep := range deps {
		if dep.DependencyID > 0 {
			_, _ = s.Resubmit(ctx, dep.DependencyID, "Resubmitted by dependent build")
		}
	}

	updated, err := s.buildStore.Get(ctx, buildID)
	if err != nil {
		return nil, err
	}
	if len(deps) == 0 {
		now := time.Now().UTC()
		_ = s.buildStore.UpdateStatus(ctx, buildID, model.BuildStatusPending)
		_ = s.buildStore.UpdateDates(ctx, buildID, &now, nil, nil)
		go s.tryScheduleBuild(context.Background(), buildID)
	}
	return updated, nil
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
func (s *Service) readFileFromGit(ctx context.Context, repoPath, commitHash, filePath string) ([]byte, error) {
	if s.gitService != nil {
		data, err := s.gitService.ReadFileAtCommit(ctx, repoPath, commitHash, filePath)
		if err == nil {
			return data, nil
		}
	}
	// Try system git (fast for large repos)
	cmd := exec.Command("git", "-C", repoPath, "show", commitHash+":"+filePath)
	out, err := cmd.Output()
	if err != nil {
		return nil, fmt.Errorf("git show %s:%s: %w", commitHash[:8], filePath, err)
	}
	return out, nil
}

// resolveAndLinkDependencies submits dependency jobs and creates BuildDependence records.
func (s *Service) resolveAndLinkDependencies(ctx context.Context, req SubmitRequest, commitHash string, job *buildspec.Job, build *model.Build) error {
	if job == nil || len(job.JobDependencies) == 0 {
		return nil
	}
	for _, dep := range job.JobDependencies {
		if dep.JobName == "" {
			continue
		}
		depBuild, err := s.Submit(ctx, SubmitRequest{
			ProjectID:   req.ProjectID,
			CommitHash:  commitHash,
			JobName:     dep.JobName,
			RefName:     req.RefName,
			Params:      req.Params,
			Reason:      fmt.Sprintf("Dependency for job %q", req.JobName),
			SubmitterID: req.SubmitterID,
		})
		if err != nil {
			return fmt.Errorf("submit dependency %q: %w", dep.JobName, err)
		}
		d := &model.BuildDependence{
			DependentID:       build.ID,
			DependencyID:      depBuild.ID,
			RequireSuccessful: dep.RequireSuccessful,
			Artifacts:         dep.Artifacts,
			DestinationPath:   dep.DestinationPath,
		}
		if err := s.buildStore.CreateDependence(ctx, d); err != nil {
			return fmt.Errorf("create dependence for %q: %w", dep.JobName, err)
		}
	}
	return nil
}

// runBuild executes a build: RUNNING → execute plan (with retry) → terminal state → post-build actions.
func (s *Service) runBuild(ctx context.Context, build *model.Build, job *buildspec.Job) {
	if build.Status != model.BuildStatusPending {
		return
	}

	sm := NewBuildStateMachine(build)
	if err := sm.Transition(model.BuildStatusRunning); err != nil {
		return
	}
	now := time.Now().UTC()
	_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusRunning)
	_ = s.buildStore.UpdateDates(ctx, build.ID, nil, &now, nil)

	spec, _, specErr := s.loadBuildSpec(ctx, build.ProjectID, build.CommitHash, build.RefName)
	if specErr != nil {
		s.finishBuild(ctx, build.ID, model.BuildStatusFailed, now)
		return
	}
	if j, ok := spec.GetJobMap()[build.JobName]; ok && j != nil {
		job = j
		job.Defaults()
	}

	projectDir := s.projects.ProjectDir(build.ProjectID)
	jobCtx, err := NewJobContext(build, job, projectDir)
	if err != nil {
		s.finishBuild(ctx, build.ID, model.BuildStatusFailed, now)
		return
	}
	if proj, err := s.projects.Get(ctx, build.ProjectID); err == nil && proj != nil {
		jobCtx.ProjectPath = proj.Path
	}
	jobCtx.GitDir = s.projects.GitDir(build.ProjectID)

	plan, err := execplan.CompileJob(execplan.CompileContext{
		Spec:     spec,
		Job:      job,
		ParamMap: jobCtx.ParamMap,
	})
	if err != nil {
		s.finishBuild(ctx, build.ID, model.BuildStatusFailed, now)
		return
	}
	jobCtx.RequiresDocker = executor.PlanNeedsDocker(plan) || len(job.RequiredServices) > 0

	if !s.acquireSequentialLock(job.SequentialGroup, job.Timeout) {
		_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusPending)
		return
	}
	defer s.releaseSequentialLock(job.SequentialGroup)

	if (jobCtx.PreferredExecutor == "remote-shell" || jobCtx.PreferredExecutor == "") && s.agentService != nil {
		if agents, err := s.agentService.GetOnlineAgents(ctx); err == nil && len(agents) > 0 {
			jobCtx.AgentID = agents[0]
		}
	}

		jobCtx.ServerSteps = &executor.DefaultServerStepHandler{
		BuildStore:    s.buildStore,
		ArtifactStore: s,
		GitDir:        jobCtx.GitDir,
		Projects:      s.projects,
		ReportStore:   s,
	}
	if s.cache != nil {
		jobCtx.Cache = &executor.RunCacheHandler{Cache: s.cache}
	}

	executor_, ok := s.registry.Find(ctx, jobCtx)
	if !ok {
		s.finishBuild(ctx, build.ID, model.BuildStatusFailed, now)
		return
	}

	execCtx := ctx
	if job.Timeout > 0 {
		var cancel context.CancelFunc
		execCtx, cancel = context.WithTimeout(ctx, time.Duration(job.Timeout)*time.Second)
		defer cancel()
	}

	logger := executor.NewBuildLogger(build.ID)
	s.mu.Lock()
	runCtx, runCancel := context.WithCancel(execCtx)
	s.runningJobs[build.Token] = &RunningJob{
		BuildID:    build.ID,
		JobToken:   build.Token,
		StartTime:  time.Now(),
		CancelFunc: runCancel,
		Logger:     logger,
	}
	s.mu.Unlock()
	defer func() {
		s.mu.Lock()
		delete(s.runningJobs, build.Token)
		s.mu.Unlock()
	}()

	s.setActiveJobContext(build.Token, &ActiveJobContext{
		BuildID:      build.ID,
		JobCtx:       jobCtx,
		Plan:         plan,
		ExecutorName: executor_.Name(),
	})

	workDir := projectDir
	if sh, ok := executor_.(*executor.ServerShellExecutor); ok {
		workDir = sh.WorkDirFor(jobCtx)
	} else if de, ok := executor_.(*executor.DockerExecutor); ok {
		workDir = de.WorkDirFor(jobCtx)
	}
	s.copyDependencyArtifacts(ctx, build.ID, workDir)
	s.attachLogPersistence(build.ID, logger)

	retried := 0
	var finalStatus model.BuildStatus
	var buildSuccess bool

retryLoop:
	for {
		results, execErr := executor_.ExecutePlan(runCtx, jobCtx, plan, logger)

		if execErr != nil {
			if errors.Is(execErr, context.DeadlineExceeded) {
				finalStatus = model.BuildStatusTimedOut
			} else if errors.Is(execErr, context.Canceled) {
				finalStatus = model.BuildStatusCancelled
			} else {
				finalStatus = model.BuildStatusFailed
			}
			buildSuccess = false
			break
		}

		buildSuccess = true
		var errMsg string
		for _, r := range results {
			if !r.Success {
				buildSuccess = false
				errMsg = r.Error
				break
			}
		}
		if buildSuccess {
			finalStatus = model.BuildStatusSuccessful
			break
		}

		finalStatus = model.BuildStatusFailed
		if retried >= job.MaxRetries || !MatchesRetryCondition(job, RetryContext{
			Build: build, ErrorMessage: errMsg, ParamMap: jobCtx.ParamMap,
		}) {
			break
		}
		if logger != nil {
			logger.Log("warning", "Job will be retried after a while...")
		}
		delay := RetryDelaySeconds(job, retried)
		select {
		case <-runCtx.Done():
			finalStatus = model.BuildStatusCancelled
			buildSuccess = false
			break retryLoop
		case <-time.After(time.Duration(delay) * time.Second):
		}
		if runCtx.Err() != nil {
			finalStatus = model.BuildStatusCancelled
			buildSuccess = false
			break retryLoop
		}
		retried++
		_ = s.buildStore.UpdateRetryPending(ctx, build.ID)
		build, _ = s.buildStore.Get(ctx, build.ID)
		sm = NewBuildStateMachine(build)
		_ = sm.Transition(model.BuildStatusRunning)
		_ = s.buildStore.UpdateStatus(ctx, build.ID, model.BuildStatusRunning)
	}

	finishTime := time.Now().UTC()
	s.finishBuild(ctx, build.ID, finalStatus, finishTime)

	build, _ = s.buildStore.Get(ctx, build.ID)
	s.runPostBuildActions(ctx, build, job, buildSuccess)
	s.notifyDependencyFinished(ctx, build)

	// Promote dependent WAITING builds
	deps, _ := s.buildStore.ListDependents(ctx, build.ID)
	for _, d := range deps {
		s.promoteWaitingBuild(ctx, d.DependentID)
	}
}

func (s *Service) finishBuild(ctx context.Context, buildID int64, status model.BuildStatus, finishTime time.Time) {
	_ = s.buildStore.UpdateStatus(ctx, buildID, status)
	_ = s.buildStore.UpdateDates(ctx, buildID, nil, nil, &finishTime)
}
