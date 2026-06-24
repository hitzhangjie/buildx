package logging_test

import (
	"testing"

	"log/slog"

	"github.com/hitzhangjie/buildx/buildx-server/internal/logging"
)

func TestParseLevel(t *testing.T) {
	tests := []struct {
		in   string
		want slog.Level
	}{
		{"trace", logging.LevelTrace},
		{"TRACE", logging.LevelTrace},
		{" Trace ", logging.LevelTrace},
		{"debug", slog.LevelDebug},
		{"DEBUG", slog.LevelDebug},
		{"info", slog.LevelInfo},
		{"INFO", slog.LevelInfo},
		{"warn", slog.LevelWarn},
		{"WARN", slog.LevelWarn},
		{"error", slog.LevelError},
		{"ERROR", slog.LevelError},
		{"", slog.LevelInfo},
		{"unknown", slog.LevelInfo},
		{"fatal", slog.LevelInfo}, // not a separate level in slog
	}

	for _, tc := range tests {
		got := logging.ParseLevel(tc.in)
		if got != tc.want {
			t.Errorf("ParseLevel(%q) = %v, want %v", tc.in, got, tc.want)
		}
	}
}

func TestLevelTraceIsBelowDebug(t *testing.T) {
	if logging.LevelTrace >= slog.LevelDebug {
		t.Errorf("LevelTrace (%d) should be < LevelDebug (%d)", logging.LevelTrace, slog.LevelDebug)
	}
}
