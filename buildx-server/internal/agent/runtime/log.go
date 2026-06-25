package runtime

import (
	"sync"
	"time"
)

const maxLogEntriesPerAgent = 1000

// LogLevel represents the severity of a log entry.
type LogLevel string

const (
	LogLevelInfo  LogLevel = "INFO"
	LogLevelWarn  LogLevel = "WARN"
	LogLevelError LogLevel = "ERROR"
	LogLevelDebug LogLevel = "DEBUG"
)

// LogEntry represents a single agent log line.
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     LogLevel  `json:"level"`
	Message   string    `json:"message"`
}

// LogStore is an in-memory ring buffer for agent logs.
// It retains the last maxLogEntriesPerAgent entries per agent.
type LogStore struct {
	mu    sync.RWMutex
	logs  map[int64][]LogEntry
}

// NewLogStore creates a new LogStore.
func NewLogStore() *LogStore {
	return &LogStore{
		logs: make(map[int64][]LogEntry),
	}
}

// Append adds a log entry for the given agent. If the ring buffer is full,
// the oldest entry is evicted.
func (l *LogStore) Append(agentID int64, level, message string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	entry := LogEntry{
		Timestamp: time.Now().UTC(),
		Level:     LogLevel(level),
		Message:   message,
	}

	buf := l.logs[agentID]
	if len(buf) >= maxLogEntriesPerAgent {
		buf = buf[1:]
	}
	buf = append(buf, entry)
	l.logs[agentID] = buf
}

// GetLogs returns the last n log entries for the given agent.
// If limit <= 0 or limit > maxLogEntriesPerAgent, all entries are returned.
func (l *LogStore) GetLogs(agentID int64, limit int) []LogEntry {
	l.mu.RLock()
	defer l.mu.RUnlock()

	buf := l.logs[agentID]
	if buf == nil {
		return []LogEntry{}
	}

	if limit <= 0 || limit >= len(buf) {
		result := make([]LogEntry, len(buf))
		copy(result, buf)
		return result
	}

	result := make([]LogEntry, limit)
	copy(result, buf[len(buf)-limit:])
	return result
}

// Clear removes all log entries for the given agent.
func (l *LogStore) Clear(agentID int64) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.logs, agentID)
}
