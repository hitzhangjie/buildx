package job

import (
	"bufio"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// FileLogReader reads persisted build log files from disk.
type FileLogReader struct {
	dir string
}

// NewFileLogReader creates a reader for {dir}/builds/{buildID}.log files.
func NewFileLogReader(dir string) *FileLogReader {
	return &FileLogReader{dir: dir}
}

var logLinePattern = regexp.MustCompile(`^\[(.+?)\] ([^:]+): (.*)$`)

// GetLogs reads stored log lines for a build.
func (r *FileLogReader) GetLogs(_ context.Context, buildID int64, since time.Time) ([]LogEntry, error) {
	if r == nil || r.dir == "" {
		return nil, fmt.Errorf("%w: log persistence not configured", ErrNotFound)
	}
	path := filepath.Join(r.dir, "builds", fmt.Sprintf("%d.log", buildID))
	f, err := os.Open(path)
	if err != nil {
		if os.IsNotExist(err) {
			return []LogEntry{}, nil
		}
		return nil, err
	}
	defer f.Close()

	var entries []LogEntry
	sc := bufio.NewScanner(f)
	var seq int64
	for sc.Scan() {
		line := sc.Text()
		entry := parseLogLine(buildID, line, &seq)
		if !since.IsZero() && entry.Timestamp.Before(since) {
			continue
		}
		entries = append(entries, entry)
	}
	return entries, sc.Err()
}

// StreamLogs tails a log file until context cancel or file close.
func (r *FileLogReader) StreamLogs(ctx context.Context, buildID int64) (<-chan LogEntry, error) {
	ch := make(chan LogEntry, 64)
	if r == nil || r.dir == "" {
		close(ch)
		return ch, nil
	}
	path := filepath.Join(r.dir, "builds", fmt.Sprintf("%d.log", buildID))
	go func() {
		defer close(ch)
		var seq int64
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}
			f, err := os.Open(path)
			if err != nil {
				if os.IsNotExist(err) {
					time.Sleep(500 * time.Millisecond)
					continue
				}
				return
			}
			sc := bufio.NewScanner(f)
			for sc.Scan() {
				entry := parseLogLine(buildID, sc.Text(), &seq)
				select {
				case <-ctx.Done():
					f.Close()
					return
				case ch <- entry:
				}
			}
			f.Close()
			time.Sleep(500 * time.Millisecond)
		}
	}()
	return ch, nil
}

func parseLogLine(buildID int64, line string, seq *int64) LogEntry {
	*seq++
	entry := LogEntry{ID: *seq, BuildID: buildID, Timestamp: time.Now().UTC(), Level: "info", Message: line}
	if m := logLinePattern.FindStringSubmatch(line); len(m) == 4 {
		if ts, err := time.Parse("2006-01-02T15:04:05Z", m[1]); err == nil {
			entry.Timestamp = ts
		}
		entry.Level = strings.TrimSpace(m[2])
		entry.Message = MaskSecrets(m[3])
	} else {
		entry.Message = MaskSecrets(line)
	}
	return entry
}

var secretPatterns []*regexp.Regexp

func loadSecretPatterns() {
	var patterns []*regexp.Regexp
	for _, kv := range os.Environ() {
		if !strings.HasPrefix(kv, "BUILDX_SECRET_") {
			continue
		}
		parts := strings.SplitN(kv, "=", 2)
		if len(parts) != 2 || parts[1] == "" {
			continue
		}
		patterns = append(patterns, regexp.MustCompile(regexp.QuoteMeta(parts[1])))
	}
	secretPatterns = patterns
}

// MaskSecrets redacts known secret values from log text.
func MaskSecrets(s string) string {
	loadSecretPatterns()
	out := s
	for _, re := range secretPatterns {
		out = re.ReplaceAllString(out, "********")
	}
	return out
}

// Append implements LogStore for optional DB-backed logs (delegates to file reader append).
func (r *FileLogReader) Append(_ context.Context, entry LogEntry) error {
	if r == nil || r.dir == "" {
		return nil
	}
	dir := filepath.Join(r.dir, "builds")
	_ = os.MkdirAll(dir, 0755)
	path := filepath.Join(dir, fmt.Sprintf("%d.log", entry.BuildID))
	f, err := os.OpenFile(path, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}
	defer f.Close()
	line := fmt.Sprintf("[%s] %s: %s\n", entry.Timestamp.Format("2006-01-02T15:04:05Z"), entry.Level, MaskSecrets(entry.Message))
	_, err = f.WriteString(line)
	return err
}
