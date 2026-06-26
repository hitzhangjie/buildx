package job

import (
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// RetryContext holds inputs for retry condition evaluation.
type RetryContext struct {
	Build        *model.Build
	ErrorMessage string
	LogText      string
	ParamMap     map[string]string
	Success      bool
}

// MatchesRetryCondition evaluates a job's retryCondition string.
// Supports: never, always, log contains "...", param "name" is "value",
// and branch param predicates (simplified OneDev parity).
func MatchesRetryCondition(job *buildspec.Job, ctx RetryContext) bool {
	if job == nil {
		return false
	}
	cond := strings.TrimSpace(job.RetryCondition)
	if cond == "" || strings.EqualFold(cond, "never") {
		return false
	}
	if strings.EqualFold(cond, "always") {
		return true
	}
	lower := strings.ToLower(cond)
	if strings.HasPrefix(lower, "log contains ") {
		frag := extractQuotedFragment(cond, "log contains ")
		searchIn := ctx.LogText
		if searchIn == "" {
			searchIn = ctx.ErrorMessage
		}
		return frag != "" && strings.Contains(searchIn, frag)
	}
	if strings.HasPrefix(lower, `param "`) || strings.HasPrefix(lower, "param ") {
		return matchParamCondition(cond, ctx.ParamMap)
	}
	if strings.HasPrefix(lower, "successful") && ctx.Success {
		return true
	}
	if strings.HasPrefix(lower, "failed") && !ctx.Success {
		return true
	}
	return false
}

func extractQuotedFragment(cond, prefix string) string {
	cond = strings.TrimSpace(cond)
	if strings.HasPrefix(strings.ToLower(cond), strings.ToLower(prefix)+`"`) {
		start := len(prefix) + 1
		end := strings.LastIndex(cond, `"`)
		if end > start {
			return cond[start:end]
		}
	}
	frag := strings.TrimPrefix(cond, prefix)
	frag = strings.TrimPrefix(frag, "Log contains ")
	frag = strings.TrimPrefix(frag, "log contains ")
	return strings.Trim(frag, `"`)
}

func matchParamCondition(cond string, params map[string]string) bool {
	// param "name" is "value"
	cond = strings.TrimSpace(cond)
	if !strings.HasPrefix(strings.ToLower(cond), "param ") {
		return false
	}
	body := strings.TrimPrefix(cond, "param ")
	body = strings.TrimPrefix(body, "Param ")
	parts := strings.Split(body, " is ")
	if len(parts) != 2 {
		return false
	}
	name := strings.Trim(strings.TrimSpace(parts[0]), `"`)
	want := strings.Trim(strings.TrimSpace(parts[1]), `"`)
	if params == nil {
		return false
	}
	return params[name] == want
}

// RetryDelaySeconds returns exponential backoff delay for attempt retried (0-based).
func RetryDelaySeconds(job *buildspec.Job, retried int) int64 {
	if job == nil || job.RetryDelay <= 0 {
		return int64(buildspec.DefaultRetryDelay)
	}
	delay := int64(job.RetryDelay)
	for i := 0; i < retried; i++ {
		delay *= 2
	}
	return delay
}
