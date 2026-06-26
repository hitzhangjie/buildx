package executor

import (
	"context"
	"fmt"
	"strings"
)

// MatchContext holds project/job context for executor applicability checks.
// Maps to OneDev JobMatchContext (subset used by buildspec editor suggestions).
type MatchContext struct {
	ProjectPath string
	Branch      string
	CommitHash  string
	JobName     string
}

// Resolve selects a job executor per OneDev DefaultJobService.getJobExecutor.
// preferredName is the interpolated job.jobExecutor value (empty = auto).
func (r *Registry) Resolve(ctx context.Context, jobCtx *JobContext, preferredName string) (JobExecutor, error) {
	if preferredName != "" {
		e, ok := r.Get(preferredName)
		if !ok {
			return nil, fmt.Errorf("unable to find specified job executor %q", preferredName)
		}
		cfg := r.configByName(preferredName)
		if cfg == nil || !cfg.Enabled {
			return nil, fmt.Errorf("specified job executor %q is disabled", preferredName)
		}
		if !e.IsApplicable(ctx, jobCtx) {
			return nil, fmt.Errorf("specified job executor %q is not applicable for current job", preferredName)
		}
		return e, nil
	}
	if !r.AdminMode() {
		e, ok := r.Find(ctx, jobCtx)
		if !ok {
			return nil, fmt.Errorf("no applicable executor discovered for current job")
		}
		return e, nil
	}
	configs := r.Configs()
	if len(configs) > 0 {
		for _, name := range r.orderedNames() {
			cfg := r.configByName(name)
			if cfg == nil || !cfg.Enabled {
				continue
			}
			e, ok := r.Get(name)
			if !ok {
				continue
			}
			if e.IsApplicable(ctx, jobCtx) {
				return e, nil
			}
		}
		return nil, fmt.Errorf("no applicable job executor")
	}
	return nil, fmt.Errorf("no applicable executor discovered for current job")
}

// ListApplicableNames returns enabled executor names applicable to match.
func (r *Registry) ListApplicableNames(ctx context.Context, jobCtx *JobContext, match *MatchContext) []string {
	var names []string
	for _, name := range r.orderedNames() {
		cfg := r.configByName(name)
		if cfg == nil || !cfg.Enabled {
			continue
		}
		if match != nil && match.JobName != "" && !matchJobName(match.JobName, cfg.JobMatch) {
			continue
		}
		e, ok := r.Get(name)
		if !ok {
			continue
		}
		if jobCtx == nil || e.IsApplicable(ctx, jobCtx) {
			names = append(names, name)
		}
	}
	return names
}

func (r *Registry) configByName(name string) *ExecutorConfig {
	for _, cfg := range r.Configs() {
		if cfg.Name == name {
			cp := *cfg
			return &cp
		}
	}
	return nil
}

func (r *Registry) orderedNames() []string {
	seen := make(map[string]bool)
	var names []string
	for _, n := range executorPriority {
		if _, ok := r.Get(n); ok {
			names = append(names, n)
			seen[n] = true
		}
	}
	for _, cfg := range r.Configs() {
		if !seen[cfg.Name] {
			names = append(names, cfg.Name)
		}
	}
	return names
}

func matchJobName(jobName, expr string) bool {
	if expr == "" || expr == "*" {
		return true
	}
	parts := strings.Split(expr, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" || part == "*" {
			return true
		}
		if strings.HasPrefix(part, ":") && strings.HasSuffix(part, ":") {
			sub := part[1 : len(part)-1]
			if strings.Contains(jobName, sub) {
				return true
			}
		} else if strings.HasPrefix(part, ":") {
			if strings.HasPrefix(jobName, part[1:]) {
				return true
			}
		} else if strings.HasSuffix(part, ":") {
			suffix := part[:len(part)-1]
			if strings.HasSuffix(jobName, suffix) {
				return true
			}
		} else if jobName == part {
			return true
		}
	}
	return false
}
