package job

import (
	"sync"
	"time"
)

// LogEntry represents a single log line from a build.
// This is the job service's log entry type, used for SSE streaming to the UI.
type LogEntry struct {
	ID        int64     `json:"id"`
	BuildID   int64     `json:"buildId"`
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"` // "stdout", "stderr", "info", "warn", "error"
	Message   string    `json:"message"`
	StepName  string    `json:"stepName,omitempty"`
}

// LogBuffer is an in-memory ring buffer for build logs (maps to OneDev's log
// streaming mechanism). It supports concurrent writes and SSE fan-out via channels.
type LogBuffer struct {
	buildID  int64
	entries  []LogEntry
	capacity int
	nextSeq  int64
	mu       sync.RWMutex
	subs     map[chan LogEntry]struct{}
	closed   bool
}

// NewLogBuffer creates a LogBuffer with the given capacity (max entries kept in memory).
func NewLogBuffer(buildID int64, capacity int) *LogBuffer {
	if capacity <= 0 {
		capacity = 10000 // default: keep 10k entries in memory
	}
	return &LogBuffer{
		buildID:  buildID,
		entries:  make([]LogEntry, 0, capacity),
		capacity: capacity,
		subs:     make(map[chan LogEntry]struct{}),
	}
}

// Append adds a log entry to the buffer and broadcasts it to all subscribers.
// If the buffer is full, the oldest entry is evicted (ring buffer behavior).
func (lb *LogBuffer) Append(entry LogEntry) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if lb.closed {
		return
	}

	lb.nextSeq++
	entry.ID = lb.nextSeq
	entry.BuildID = lb.buildID

	if len(lb.entries) >= lb.capacity {
		// Evict oldest entry (shift left)
		copy(lb.entries, lb.entries[1:])
		lb.entries[len(lb.entries)-1] = entry
	} else {
		lb.entries = append(lb.entries, entry)
	}

	// Broadcast to all subscribers (non-blocking)
	for ch := range lb.subs {
		select {
		case ch <- entry:
		default:
			// Drop entry for slow consumers
		}
	}
}

// Entries returns a copy of all log entries in the buffer.
func (lb *LogBuffer) Entries() []LogEntry {
	lb.mu.RLock()
	defer lb.mu.RUnlock()

	cp := make([]LogEntry, len(lb.entries))
	copy(cp, lb.entries)
	return cp
}

// Subscribe returns a channel that receives new log entries as they arrive.
// The caller must call Unsubscribe to prevent goroutine leaks.
func (lb *LogBuffer) Subscribe() chan LogEntry {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	ch := make(chan LogEntry, 256)
	lb.subs[ch] = struct{}{}
	return ch
}

// Unsubscribe removes a previously subscribed channel.
func (lb *LogBuffer) Unsubscribe(ch chan LogEntry) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	delete(lb.subs, ch)
}

// Close marks the buffer as closed and closes all subscriber channels.
// After Close, Append is a no-op.
func (lb *LogBuffer) Close() {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if lb.closed {
		return
	}
	lb.closed = true
	for ch := range lb.subs {
		close(ch)
	}
}
