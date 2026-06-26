package job

import (
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// ForwardAgentBuildLog appends a log line from a remote agent to the running build.
func (s *Service) ForwardAgentBuildLog(jobToken, level, message string) {
	if s == nil || jobToken == "" {
		return
	}
	s.mu.RLock()
	rj, ok := s.runningJobs[jobToken]
	s.mu.RUnlock()
	if !ok || rj == nil {
		return
	}
	msg := MaskSecrets(message)
	if rj.Logger != nil {
		rj.Logger.Log(level, msg)
	}
	if rj.BuildID > 0 {
		s.mu.RLock()
		lb := s.logBuffers[rj.BuildID]
		s.mu.RUnlock()
		if lb != nil {
			lb.Append(LogEntry{
				BuildID:   rj.BuildID,
				Timestamp: time.Now().UTC(),
				Level:     level,
				Message:   msg,
			})
		}
	}
}

// Ensure BuildLogger satisfies executor.TaskLogger at compile time.
var _ executor.TaskLogger = (*executor.BuildLogger)(nil)
