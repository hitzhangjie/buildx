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
	ParamMap     map[string]string
}

// MatchesRetryCondition evaluates a job's retryCondition string.
// Supports: never, always, and log contains "..." (simplified OneDev parity).
func MatchesRetryCondition(job *buildspec.Job, ctx RetryContext) bool {
	if job == nil {
		return false
	}
	cond := strings.TrimSpace(strings.ToLower(job.RetryCondition))
	if cond == "" || cond == "never" {
		return false
	}
	if cond == "always" {
		return true
	}
	// log contains "fragment"
	if strings.HasPrefix(cond, "log contains ") {
		frag := strings.Trim(cond, `"`)
		if strings.HasPrefix(cond, "log contains \"") {
			end := strings.LastIndex(cond, `"`)
			if end > len("log contains \"") {
				frag = cond[len("log contains \"") : end]
			}
		} else {
			frag = strings.TrimPrefix(cond, "log contains ")
			frag = strings.Trim(frag, `"`)
		}
		return frag != "" && strings.Contains(ctx.ErrorMessage, frag)
	}
	return false
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
