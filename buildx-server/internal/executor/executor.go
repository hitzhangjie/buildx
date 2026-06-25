// Package executor defines the JobExecutor abstraction for running CI/CD job steps.
//
// It maps to OneDev's io.onedev.server.buildsystem.executor package and provides
// the bridge between the job scheduling service and actual command execution,
// whether on the server directly, on remote agents, or via other execution
// backends.
package executor

import (
	"context"
	"fmt"
	"sync"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

// JobContext holds the runtime context for a job execution.
// This is the primary data structure passed to every executor invocation,
// containing all information needed to set up and run a build job.
type JobContext struct {
	BuildID     int64  `json:"buildId"`
	BuildNumber int    `json:"buildNumber"`
	ProjectID   int64  `json:"projectId"`
	ProjectPath string `json:"projectPath"`
	JobName     string `json:"jobName"`
	JobToken    string `json:"jobToken"`
	CommitHash  string `json:"commitHash"`
	RefName     string `json:"refName"`
	WorkDir     string `json:"workDir"`
	AgentID     int64  `json:"agentId"`   // 0 for server-side executors
	AgentName   string `json:"agentName"` // empty for server-side executors
	EnvVars     map[string]string
	ParamMap    map[string]string
	Timeout     int64 // seconds; 0 means no timeout

	// GitDir is the bare repository path for checkout steps (server-shell).
	GitDir string

	// ServerSteps executes server-side buildspec steps (PublishArtifact, SetBuildVersion, …).
	ServerSteps ServerStepHandler

	// Cache restores/saves job cache (SetupCacheStep).
	Cache CacheHandler

	// PreferredExecutor is set from buildspec job.jobExecutor before registry lookup.
	PreferredExecutor string

	// RequiresDocker is set when the compiled plan needs a docker-aware executor.
	RequiresDocker bool
}

// TaskLogger is the logging interface for job steps.
// Steps use this to stream log output that is persisted, displayed in the UI,
// and potentially streamed via SSE to live viewers.
type TaskLogger interface {
	// Log writes a structured log entry at the given level.
	Log(level, message string)

	// Logf is a formatted variant of Log.
	Logf(level, format string, args ...interface{})

	// Stdout logs a message at stdout level (normal command output).
	Stdout(message string)

	// Stderr logs a message at stderr level (command error output).
	Stderr(message string)
}

// StepResult holds the result of executing a single step.
// The job service collects these into a build's overall result.
type StepResult struct {
	Name       string `json:"name"`
	Success    bool   `json:"success"`
	ExitCode   int    `json:"exitCode"`
	DurationMs int64  `json:"durationMs"`
	Error      string `json:"error,omitempty"`
}

// JobExecutor is the interface that all executor implementations must satisfy.
// It maps to OneDev's JobExecutor abstract class and provides the contract
// for executing job steps in various environments (local shell, remote agent,
// Kubernetes, Docker, etc.).
type JobExecutor interface {
	// Name returns the executor name (unique identifier within the registry).
	// Examples: "server-shell", "remote-shell", "kubernetes".
	Name() string

	// ExecutePlan runs a compiled Action plan in the given context.
	ExecutePlan(ctx context.Context, jobCtx *JobContext, plan *execplan.Plan, logger TaskLogger) ([]StepResult, error)

	// Execute runs legacy flat command strings. Prefer ExecutePlan for new code.
	Execute(ctx context.Context, jobCtx *JobContext, commands []string, logger TaskLogger) ([]StepResult, error)

	// IsApplicable checks if this executor can handle the given job context.
	// Used by the registry's Find method to select the appropriate executor.
	IsApplicable(ctx context.Context, jobCtx *JobContext) bool

	// Enabled returns whether this executor is currently enabled.
	Enabled() bool

	// SupportsHTMLReports returns whether the executor can publish HTML reports.
	SupportsHTMLReports() bool

	// SupportsSitePublishing returns whether the executor can publish static sites.
	SupportsSitePublishing() bool
}

// ExecutorConfig holds configuration for a specific executor type.
// Configurations are persisted and can be updated at runtime.
type ExecutorConfig struct {
	Name               string `json:"name"`
	Enabled            bool   `json:"enabled"`
	HTMLReportEnabled  bool   `json:"htmlReportEnabled"`
	SitePublishEnabled bool   `json:"sitePublishEnabled"`
	JobMatch           string `json:"jobMatch,omitempty"` // job match expression
}

// Registry manages available executors and provides lookup by name or match.
// It is safe for concurrent use.
type Registry struct {
	mu        sync.RWMutex
	executors map[string]JobExecutor
	configs   map[string]*ExecutorConfig
}

// NewRegistry creates an empty executor registry.
func NewRegistry() *Registry {
	return &Registry{
		executors: make(map[string]JobExecutor),
		configs:   make(map[string]*ExecutorConfig),
	}
}

// Register adds an executor with its configuration to the registry.
// If an executor with the same name already exists, it is replaced.
func (r *Registry) Register(executor JobExecutor, config *ExecutorConfig) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if config == nil {
		config = &ExecutorConfig{
			Name:    executor.Name(),
			Enabled: true,
		}
	}
	r.executors[executor.Name()] = executor
	r.configs[executor.Name()] = config
}

// Get retrieves an executor by name. Returns false if not found.
func (r *Registry) Get(name string) (JobExecutor, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	e, ok := r.executors[name]
	return e, ok
}

// List returns all registered executors.
func (r *Registry) List() []JobExecutor {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]JobExecutor, 0, len(r.executors))
	for _, e := range r.executors {
		list = append(list, e)
	}
	return list
}

// executorPriority defines selection order (first applicable wins).
var executorPriority = []string{"remote-shell", "server-docker", "server-shell"}

// Find locates the first enabled executor whose IsApplicable returns true for
// the given job context. Honors jobCtx.PreferredExecutor when set.
func (r *Registry) Find(ctx context.Context, jobCtx *JobContext) (JobExecutor, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if jobCtx != nil && jobCtx.PreferredExecutor != "" {
		if e, ok := r.executors[jobCtx.PreferredExecutor]; ok {
			cfg := r.configs[jobCtx.PreferredExecutor]
			if cfg != nil && cfg.Enabled && e.IsApplicable(ctx, jobCtx) {
				return e, true
			}
		}
	}

	order := executorPriority
	for _, name := range order {
		e, ok := r.executors[name]
		if !ok {
			continue
		}
		cfg, ok := r.configs[name]
		if !ok || !cfg.Enabled {
			continue
		}
		if e.IsApplicable(ctx, jobCtx) {
			return e, true
		}
	}
	for name, e := range r.executors {
		if containsString(order, name) {
			continue
		}
		cfg, ok := r.configs[name]
		if !ok || !cfg.Enabled {
			continue
		}
		if e.IsApplicable(ctx, jobCtx) {
			return e, true
		}
	}
	return nil, false
}

func containsString(list []string, v string) bool {
	for _, s := range list {
		if s == v {
			return true
		}
	}
	return false
}

// Configs returns a copy of all registered executor configurations.
func (r *Registry) Configs() []*ExecutorConfig {
	r.mu.RLock()
	defer r.mu.RUnlock()
	list := make([]*ExecutorConfig, 0, len(r.configs))
	for _, cfg := range r.configs {
		// Return a copy to prevent external mutation.
		cp := *cfg
		list = append(list, &cp)
	}
	return list
}

// UpdateConfig updates the configuration for a named executor.
// Returns an error if the executor is not registered.
func (r *Registry) UpdateConfig(name string, config *ExecutorConfig) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, ok := r.executors[name]; !ok {
		return fmt.Errorf("executor %q not found", name)
	}
	r.configs[name] = config
	return nil
}
