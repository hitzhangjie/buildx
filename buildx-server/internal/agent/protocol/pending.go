// Package protocol holds agent↔server message helpers without import cycles.
package protocol

import (
	"encoding/json"
	"sync"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
)

type pendingJob struct {
	done chan jobdata.JobResult
}

var (
	pendingMu sync.Mutex
	pending   = map[string]*pendingJob{}
)

// RegisterPending registers a waiter for an agent job completion message.
func RegisterPending(jobToken string) chan jobdata.JobResult {
	ch := make(chan jobdata.JobResult, 1)
	pendingMu.Lock()
	pending[jobToken] = &pendingJob{done: ch}
	pendingMu.Unlock()
	return ch
}

// CompletePending delivers a job result to a registered waiter.
func CompletePending(result jobdata.JobResult) bool {
	pendingMu.Lock()
	p, ok := pending[result.JobToken]
	if ok {
		delete(pending, result.JobToken)
	}
	pendingMu.Unlock()
	if !ok {
		return false
	}
	select {
	case p.done <- result:
	default:
	}
	return true
}

// CancelPending removes a pending waiter without delivering a result.
func CancelPending(jobToken string) {
	pendingMu.Lock()
	delete(pending, jobToken)
	pendingMu.Unlock()
}

// JobResultFromMessage builds a JobResult from a WebSocket completion message.
func JobResultFromMessage(token string, success bool, errMsg string, stepsRaw json.RawMessage) jobdata.JobResult {
	result := jobdata.JobResult{JobToken: token, Success: success, Error: errMsg}
	if len(stepsRaw) > 0 {
		_ = json.Unmarshal(stepsRaw, &result.Steps)
	}
	return result
}
