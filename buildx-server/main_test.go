package main

import (
	"io"
	"log/slog"
	"testing"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestNewRootCmd(t *testing.T) {
	cmd := newRootCmd()
	if cmd == nil {
		t.Fatal("expected non-nil command")
	}
	if cmd.Use != "buildx-server" {
		t.Errorf("Use = %q", cmd.Use)
	}
	names := make(map[string]bool)
	for _, sub := range cmd.Commands() {
		names[sub.Name()] = true
	}
	if !names["serve"] {
		t.Error("expected 'serve' subcommand")
	}
	if !names["version"] {
		t.Error("expected 'version' subcommand")
	}
}

func TestVersionCommand(t *testing.T) {
	cmd := newRootCmd()
	versionCmd, _, _ := cmd.Find([]string{"version"})
	if versionCmd == nil {
		t.Fatal("version command not found")
	}
	if versionCmd.Short != "Print version" {
		t.Errorf("version Short = %q", versionCmd.Short)
	}
}
