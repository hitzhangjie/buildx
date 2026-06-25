package executor

import (
	"fmt"
	"sync"
	"time"
)

// LogEntry represents a single log line from a build step.
// Entries are timestamped at creation time on the server.
type LogEntry struct {
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`     // "stdout", "stderr", "info", "warn", "error"
	Message   string    `json:"message"`
	StepName  string    `json:"stepName,omitempty"`
}

// BuildLogger implements TaskLogger and persists logs in memory.
// It supports concurrent writes and SSE streaming via channels.
type BuildLogger struct {
	buildID   int64
	entries   []LogEntry
	mu        sync.Mutex
	listeners []chan LogEntry
}

// NewBuildLogger creates a BuildLogger for the given build.
func NewBuildLogger(buildID int64) *BuildLogger {
	return &BuildLogger{
		buildID: buildID,
		entries: make([]LogEntry, 0, 128),
	}
}

// Log writes a structured log entry at the given level.
func (l *BuildLogger) Log(level, message string) {
	entry := LogEntry{
		Timestamp: time.Now().UTC(),
		Level:     level,
		Message:   message,
	}
	l.append(entry)
}

// Logf is a formatted variant of Log.
func (l *BuildLogger) Logf(level, format string, args ...interface{}) {
	l.Log(level, fmt.Sprintf(format, args...))
}

// Stdout logs a message at stdout level (normal command output).
func (l *BuildLogger) Stdout(message string) {
	l.Log("stdout", message)
}

// Stderr logs a message at stderr level (command error output).
func (l *BuildLogger) Stderr(message string) {
	l.Log("stderr", message)
}

// Entries returns a copy of all log entries.
func (l *BuildLogger) Entries() []LogEntry {
	l.mu.Lock()
	defer l.mu.Unlock()
	cp := make([]LogEntry, len(l.entries))
	copy(cp, l.entries)
	return cp
}

// Subscribe returns a channel that receives new log entries as they arrive.
// The caller must call Unsubscribe to prevent goroutine leaks.
func (l *BuildLogger) Subscribe() chan LogEntry {
	l.mu.Lock()
	defer l.mu.Unlock()
	ch := make(chan LogEntry, 64)
	l.listeners = append(l.listeners, ch)
	return ch
}

// Unsubscribe removes a previously subscribed channel so it no longer receives
// log entries. The caller should drain and close the channel after unsubscribing.
func (l *BuildLogger) Unsubscribe(ch chan LogEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	for i, listener := range l.listeners {
		if listener == ch {
			l.listeners = append(l.listeners[:i], l.listeners[i+1:]...)
			return
		}
	}
}

// append adds an entry to the internal slice and broadcasts it to all
// subscribed channels. Non-blocking sends are used; if a listener's buffer
// is full, the entry is dropped for that listener.
func (l *BuildLogger) append(entry LogEntry) {
	l.mu.Lock()
	defer l.mu.Unlock()
	l.entries = append(l.entries, entry)
	for _, ch := range l.listeners {
		select {
		case ch <- entry:
		default:
			// Drop entry for slow consumers.
		}
	}
}

// NopLogger is a TaskLogger that discards all log output.
// Useful for dry runs or testing where logging is not needed.
type NopLogger struct{}

func (NopLogger) Log(level, message string)                          {}
func (NopLogger) Logf(level, format string, args ...interface{})    {}
func (NopLogger) Stdout(message string)                              {}
func (NopLogger) Stderr(message string)                              {}
