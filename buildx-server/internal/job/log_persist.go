package job

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

func (s *Service) attachLogBuffer(buildID int64, logger *executor.BuildLogger) *LogBuffer {
	if logger == nil {
		return nil
	}
	lb := NewLogBuffer(buildID, 10000)
	s.mu.Lock()
	if s.logBuffers == nil {
		s.logBuffers = make(map[int64]*LogBuffer)
	}
	s.logBuffers[buildID] = lb
	s.mu.Unlock()

	ch := logger.Subscribe()
	go func() {
		defer logger.Unsubscribe(ch)
		for entry := range ch {
			lb.Append(LogEntry{
				BuildID:   buildID,
				Timestamp: entry.Timestamp,
				Level:     entry.Level,
				Message:   MaskSecrets(entry.Message),
				StepName:  entry.StepName,
			})
		}
	}()
	return lb
}

func logTextFromLogger(logger *executor.BuildLogger) string {
	if logger == nil {
		return ""
	}
	var b strings.Builder
	for _, e := range logger.Entries() {
		b.WriteString(e.Message)
		b.WriteByte('\n')
	}
	return b.String()
}

type logPersistWriter struct {
	path string
	mu   sync.Mutex
}

func (s *Service) attachLogPersistence(buildID int64, logger *executor.BuildLogger) {
	if s.logPersistDir == "" || logger == nil {
		return
	}
	dir := filepath.Join(s.logPersistDir, "builds")
	w := &logPersistWriter{path: filepath.Join(dir, fmt.Sprintf("%d.log", buildID))}
	_ = os.MkdirAll(dir, 0755)
	ch := logger.Subscribe()
	go func() {
		defer logger.Unsubscribe(ch)
		for entry := range ch {
			w.appendLine(fmt.Sprintf("[%s] %s: %s", entry.Timestamp.Format("2006-01-02T15:04:05Z"), entry.Level, MaskSecrets(entry.Message)))
		}
	}()
}

func (w *logPersistWriter) appendLine(line string) {
	w.mu.Lock()
	defer w.mu.Unlock()
	f, err := os.OpenFile(w.path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer f.Close()
	_, _ = f.WriteString(line + "\n")
}
