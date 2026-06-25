package job

import (
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// ---------------------------------------------------------------------------
// Match types
// ---------------------------------------------------------------------------

// MatchContext holds context for evaluating job triggers against an event.
// Maps to OneDev's TriggerMatch context.
type MatchContext struct {
	ProjectID     int64
	ProjectPath   string
	RefName       string
	CommitHash    string
	OldCommitHash string
	EventType     string // "push", "tag", "pr-open", "pr-update", "pr-merge", "schedule"
	Files         []string
	Params        map[string][]string
}

// JobTriggerMatch represents a job that should be triggered by an event.
// Maps to OneDev's TriggerMatch.
type JobTriggerMatch struct {
	JobName string
	Reason  string
	Params  map[string][]string
}

// ErrSkipCI is returned when a commit contains a [skip ci] or similar marker.
var ErrSkipCI = SkipCommitError("commit skipped by [skip ci] marker")

// SkipCommitError identifies a commit that should not trigger builds.
type SkipCommitError string

func (e SkipCommitError) Error() string { return string(e) }

// ---------------------------------------------------------------------------
// Trigger evaluation
// ---------------------------------------------------------------------------

// EvaluateTriggers checks which jobs should be triggered for the given event.
// Returns a list of (jobName, triggerMatch) pairs for jobs that should run.
//
// Maps to OneDev's JobService.submit() trigger matching logic, which iterates
// all jobs and calls getTriggerMatch(event) on each.
func EvaluateTriggers(spec *buildspec.BuildSpec, ctx *MatchContext) []JobTriggerMatch {
	if spec == nil || ctx == nil {
		return nil
	}

	var matches []JobTriggerMatch

	for _, job := range spec.Jobs {
		if job.Triggers == nil || len(job.Triggers) == 0 {
			continue
		}

		for _, trigger := range job.Triggers {
			if trigger == nil {
				continue
			}

			if matchTrigger(trigger, ctx) {
				match := JobTriggerMatch{
					JobName: job.Name,
					Reason:  formatTriggerReason(trigger, ctx),
				}

				// Resolve param matrix if defined on the trigger
				if pm := trigger.GetParamMatrix(); len(pm) > 0 {
					match.Params = resolveParamMatrix(pm)
				}

				matches = append(matches, match)
				break // first matching trigger per job wins
			}
		}
	}

	return matches
}

// matchTrigger checks if a trigger matches the given context.
func matchTrigger(trigger buildspec.JobTrigger, ctx *MatchContext) bool {
	if ctx == nil {
		return false
	}

	switch trigger.TriggerType() {
	case buildspec.TriggerTypeBranchUpdate:
		t, ok := trigger.(*buildspec.BranchUpdateTrigger)
		if !ok {
			return false
		}
		if ctx.EventType != "push" {
			return false
		}
		if t.Branches != "" && !matchRef(ctx.RefName, t.Branches) {
			return false
		}
		if t.Paths != "" && !matchPaths(ctx.Files, t.Paths) {
			return false
		}
		return true

	case buildspec.TriggerTypeTagCreate:
		t, ok := trigger.(*buildspec.TagCreateTrigger)
		if !ok {
			return false
		}
		if ctx.EventType != "tag" {
			return false
		}
		if t.Tags != "" && !matchRef(ctx.RefName, t.Tags) {
			return false
		}
		return true

	case buildspec.TriggerTypePullRequest:
		t, ok := trigger.(*buildspec.PullRequestTrigger)
		if !ok {
			return false
		}
		if ctx.EventType != "pr-open" {
			return false
		}
		if t.Branches != "" && !matchRef(ctx.RefName, t.Branches) {
			return false
		}
		if t.Paths != "" && !matchPaths(ctx.Files, t.Paths) {
			return false
		}
		return true

	case buildspec.TriggerTypePullRequestUpdate:
		t, ok := trigger.(*buildspec.PullRequestUpdateTrigger)
		if !ok {
			return false
		}
		if ctx.EventType != "pr-update" {
			return false
		}
		if t.Branches != "" && !matchRef(ctx.RefName, t.Branches) {
			return false
		}
		if t.Paths != "" && !matchPaths(ctx.Files, t.Paths) {
			return false
		}
		return true

	case buildspec.TriggerTypePullRequestMerge:
		if ctx.EventType != "pr-merge" {
			return false
		}
		return true

	case buildspec.TriggerTypePullRequestDiscard:
		if ctx.EventType != "pr-discard" {
			return false
		}
		return true

	case buildspec.TriggerTypeSchedule:
		// Schedule triggers are evaluated externally by the scheduler component.
		// Here we only match if explicitly requested.
		if ctx.EventType != "schedule" {
			return false
		}
		return true

	case buildspec.TriggerTypeDependencyFinished:
		t, ok := trigger.(*buildspec.DependencyFinishedTrigger)
		if !ok {
			return false
		}
		if ctx.EventType != "dependency-finished" {
			return false
		}
		if len(t.JobNames) > 0 {
			matchingJob := ""
			if vals, ok := ctx.Params["jobName"]; ok && len(vals) > 0 {
				matchingJob = vals[0]
			}
			for _, jn := range t.JobNames {
				if jn == matchingJob {
					return true
				}
			}
			return false
		}
		return true
	}

	return false
}

// formatTriggerReason creates a human-readable reason string for a trigger match.
func formatTriggerReason(trigger buildspec.JobTrigger, ctx *MatchContext) string {
	switch trigger.TriggerType() {
	case buildspec.TriggerTypeBranchUpdate:
		return "Branch update: " + ctx.RefName
	case buildspec.TriggerTypeTagCreate:
		return "Tag create: " + ctx.RefName
	case buildspec.TriggerTypePullRequest:
		return "Pull request opened"
	case buildspec.TriggerTypePullRequestUpdate:
		return "Pull request updated"
	case buildspec.TriggerTypePullRequestMerge:
		return "Pull request merged"
	case buildspec.TriggerTypePullRequestDiscard:
		return "Pull request discarded"
	case buildspec.TriggerTypeSchedule:
		return "Scheduled trigger"
	case buildspec.TriggerTypeDependencyFinished:
		return "Dependency finished"
	}
	return "Trigger matched"
}

// resolveParamMatrix resolves a param matrix into parameter combinations.
// For now returns a simple flattening; full matrix expansion is handled at submit time.
func resolveParamMatrix(params []buildspec.ParamInstances) map[string][]string {
	result := make(map[string][]string)
	for _, p := range params {
		if p.Name != "" && len(p.Values) > 0 {
			result[p.Name] = p.Values
		}
	}
	return result
}

// ---------------------------------------------------------------------------
// Job name matching
// ---------------------------------------------------------------------------

// MatchJob checks if a job name matches a job match expression.
// Syntax:
//   - "job1,job2" means OR match (comma-separated)
//   - ":prefix" means "starts with"
//   - "suffix:" means "ends with"
//   - "*" means match all
//   - "job1" means exact match
//
// Maps to OneDev's JobMatchExpression matching logic.
func MatchJob(jobName, matchExpr string) bool {
	if matchExpr == "" || matchExpr == "*" {
		return true
	}

	parts := strings.Split(matchExpr, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		if strings.HasPrefix(part, ":") && strings.HasSuffix(part, ":") {
			// :substring: — contains
			sub := part[1 : len(part)-1]
			if strings.Contains(jobName, sub) {
				return true
			}
		} else if strings.HasPrefix(part, ":") {
			// :prefix — starts with
			prefix := part[1:]
			if strings.HasPrefix(jobName, prefix) {
				return true
			}
		} else if strings.HasSuffix(part, ":") {
			// suffix: — ends with
			suffix := part[:len(part)-1]
			if strings.HasSuffix(jobName, suffix) {
				return true
			}
		} else if jobName == part {
			// Exact match
			return true
		}
	}

	return false
}

// ---------------------------------------------------------------------------
// Ref and path matching
// ---------------------------------------------------------------------------

// matchRef checks if a ref name matches a ref pattern.
// Pattern syntax is same as MatchJob (comma-separated, :prefix, suffix:).
// Additionally handles glob-style patterns with "*" and "?".
// Matching is performed against both the full ref name and the short name
// (branch/tag name extracted by stripping "refs/heads/" or "refs/tags/" prefix).
func matchRef(refName, pattern string) bool {
	if pattern == "" || pattern == "*" || pattern == "**" {
		return true
	}
	if refName == "" {
		return false
	}

	// Extract short name by stripping common ref prefixes.
	// This correctly handles branch names with slashes (e.g., "feature/abc").
	shortName := refName
	for _, prefix := range []string{"refs/heads/", "refs/tags/"} {
		if strings.HasPrefix(refName, prefix) {
			shortName = refName[len(prefix):]
			break
		}
	}

	// Handle negation: patterns starting with "-" exclude
	exclude := false
	if strings.HasPrefix(pattern, "-") {
		exclude = true
		pattern = pattern[1:]
	}

	parts := strings.Split(pattern, ",")
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}

		// Try matching against both full ref and short name
		if matchRefPattern(refName, part) || matchRefPattern(shortName, part) {
			return !exclude
		}
	}

	return exclude // if exclusion pattern didn't match, include by default
}

// matchRefPattern checks if a single pattern part matches a candidate name.
func matchRefPattern(name, pattern string) bool {
	if strings.HasPrefix(pattern, ":") && strings.HasSuffix(pattern, ":") {
		// :substring: — contains
		sub := pattern[1 : len(pattern)-1]
		return strings.Contains(name, sub)
	} else if strings.HasPrefix(pattern, ":") {
		// :prefix — starts with
		prefix := pattern[1:]
		return strings.HasPrefix(name, prefix)
	} else if strings.HasSuffix(pattern, ":") {
		// suffix: — ends with
		suffix := pattern[:len(pattern)-1]
		return strings.HasSuffix(name, suffix)
	} else if strings.Count(pattern, "*") == 1 && !strings.HasSuffix(pattern, "*") {
		// Single "*" wildcard match (e.g., "release-*")
		starIdx := strings.Index(pattern, "*")
		prefix := pattern[:starIdx]
		suffix := pattern[starIdx+1:]
		return strings.HasPrefix(name, prefix) && strings.HasSuffix(name, suffix) &&
			len(name) >= len(prefix)+len(suffix)
	} else if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(name, prefix)
	}
	// Exact match
	return name == pattern
}

// matchPaths checks if any changed file matches a path pattern.
// Path patterns support glob matching (comma-separated).
func matchPaths(files []string, pattern string) bool {
	if pattern == "" || len(files) == 0 {
		return true
	}
	parts := strings.Split(pattern, ",")
	for _, file := range files {
		for _, part := range parts {
			part = strings.TrimSpace(part)
			if part == "" {
				continue
			}
			if matchGlob(file, part) {
				return true
			}
		}
	}
	return false
}

// matchGlob checks if a path matches a simple glob pattern.
// Supports "*" (any sequence except "/") and "**" (any sequence including "/").
// "*" does NOT match the "/" path separator, only characters within a single
// path component. "**" matches across all path components.
func matchGlob(path, pattern string) bool {
	if pattern == "*" || pattern == "**" || pattern == "" {
		return true
	}
	if strings.Contains(pattern, "**") {
		// ** matches across directory boundaries
		parts := strings.SplitN(pattern, "**", 2)
		prefix := parts[0]
		suffix := ""
		if len(parts) > 1 {
			suffix = parts[1]
		}
		if !strings.HasPrefix(path, prefix) {
			return false
		}
		if suffix != "" && !strings.HasSuffix(path, suffix) {
			return false
		}
		return true
	}
	// Simple * matching — does not cross "/" boundaries
	if strings.Count(pattern, "*") == 1 {
		parts := strings.SplitN(pattern, "*", 2)
		prefix := parts[0]
		suffix := parts[1]

		if !strings.HasPrefix(path, prefix) {
			return false
		}
		rest := path[len(prefix):]

		// * cannot match "/" — ensure the matched portion has no slash
		if suffix == "" {
			// Pattern ends with *, match through end of path component
			return !strings.Contains(rest, "/")
		}
		if !strings.HasSuffix(path, suffix) {
			return false
		}
		// The matched portion (between prefix and suffix) must not contain "/"
		middleStart := len(prefix)
		middleEnd := len(path) - len(suffix)
		if middleStart > middleEnd {
			return false
		}
		middle := path[middleStart:middleEnd]
		return !strings.Contains(middle, "/")
	}
	// No wildcards
	return path == pattern
}

// ---------------------------------------------------------------------------
// Skip commit detection
// ---------------------------------------------------------------------------

// SkipCommit checks if a commit message contains [skip ci], [ci skip],
// [skip build], or [build skip] markers (case-insensitive).
//
// Maps to OneDev's SkipCommit detection in CommitUtils.
func SkipCommit(commitMessage string) bool {
	if commitMessage == "" {
		return false
	}
	lower := strings.ToLower(commitMessage)
	markers := []string{
		"[skip ci]",
		"[ci skip]",
		"[skip build]",
		"[build skip]",
		"[skip ci",
		"[ci skip",
	}
	for _, marker := range markers {
		if strings.Contains(lower, marker) {
			return true
		}
	}
	return false
}
