// Package logging provides shared log-level constants and slog setup helpers.
package logging

import (
	"log/slog"
	"os"
	"strings"
)

// LevelTrace is a custom slog level below Debug for highly verbose events
// such as static-file HTTP requests.
const LevelTrace = slog.Level(-8)

// levelNames maps slog.Level values to their string representations.
var levelNames = map[slog.Level]string{
	LevelTrace:    "TRACE",
	slog.LevelDebug: "DEBUG",
	slog.LevelInfo:  "INFO",
	slog.LevelWarn:  "WARN",
	slog.LevelError: "ERROR",
}

// ParseLevel converts a case-insensitive level name to slog.Level.
// Supported: trace, debug, info, warn, error, fatal.
// Unknown values return slog.LevelInfo.
func ParseLevel(s string) slog.Level {
	switch strings.ToUpper(strings.TrimSpace(s)) {
	case "TRACE":
		return LevelTrace
	case "DEBUG":
		return slog.LevelDebug
	case "INFO":
		return slog.LevelInfo
	case "WARN":
		return slog.LevelWarn
	case "ERROR":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

// LevelNames returns a sorted list of supported level names for help text.
func LevelNames() []string {
	return []string{"trace", "debug", "info", "warn", "error"}
}

// Setup configures the default slog logger with the given level and a
// human-readable text handler writing to stderr.
func Setup(level slog.Level) {
	opts := &slog.HandlerOptions{
		Level: level,
		ReplaceAttr: func(_ []string, a slog.Attr) slog.Attr {
			// Rename "msg" to "message" and add human-readable level names.
			if a.Key == slog.LevelKey {
				level := a.Value.Any().(slog.Level)
				if name, ok := levelNames[level]; ok {
					a.Value = slog.StringValue(name)
				}
			}
			return a
		},
	}
	handler := slog.NewTextHandler(os.Stderr, opts)
	slog.SetDefault(slog.New(handler))
}
