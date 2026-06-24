package api

import (
	"bytes"
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"
)

func init() {
	slog.SetDefault(slog.New(slog.NewTextHandler(io.Discard, nil)))
}

func TestIsGitRequest(t *testing.T) {
	tests := []struct {
		path string
		want bool
	}{
		{"/myproject.git/info/refs", true},
		{"/myproject.git/git-upload-pack", true},
		{"/myproject.git/git-receive-pack", true},
		{"/parent/child.git/info/refs", true},
		{"/myproject.git/git-upload-pack?service=git-upload-pack", false},
		{"/myproject/info/refs", false},
		{"/myproject.git/other", false},
		{"/", false},
		{"/.git/", false},
		{"/.git/git-upload-pack", true},
		{"", false},
	}
	for _, tc := range tests {
		t.Run(tc.path, func(t *testing.T) {
			got := isGitRequest(tc.path)
			if got != tc.want {
				t.Errorf("isGitRequest(%q) = %v, want %v", tc.path, got, tc.want)
			}
		})
	}
}

func TestParseGitURL(t *testing.T) {
	tests := []struct {
		path        string
		wantProj    string
		wantSuffix  string
		wantErr     bool
	}{
		{"/myproject.git/info/refs", "myproject", "info/refs", false},
		{"/parent/child.git/git-upload-pack", "parent/child", "git-upload-pack", false},
		{"/project.git/git-receive-pack", "project", "git-receive-pack", false},
		{"/no-git-suffix", "", "", true},
		{"/.git/info/refs", "", "", true},
		{"", "", "", true},
	}
	for _, tc := range tests {
		t.Run(tc.path, func(t *testing.T) {
			proj, suffix, err := parseGitURL(tc.path)
			if tc.wantErr {
				if err == nil {
					t.Errorf("parseGitURL(%q) expected error", tc.path)
				}
				return
			}
			if err != nil {
				t.Errorf("parseGitURL(%q): %v", tc.path, err)
				return
			}
			if proj != tc.wantProj {
				t.Errorf("projectPath = %q, want %q", proj, tc.wantProj)
			}
			if suffix != tc.wantSuffix {
				t.Errorf("gitSuffix = %q, want %q", suffix, tc.wantSuffix)
			}
		})
	}
}

func TestDoNotCache(t *testing.T) {
	w := httptest.NewRecorder()
	doNotCache(w)
	if w.Header().Get("Expires") == "" {
		t.Error("Expires header not set")
	}
	if w.Header().Get("Pragma") != "no-cache" {
		t.Errorf("Pragma = %q", w.Header().Get("Pragma"))
	}
	if w.Header().Get("Cache-Control") != "no-cache, max-age=0, must-revalidate" {
		t.Errorf("Cache-Control = %q", w.Header().Get("Cache-Control"))
	}
}

func TestWritePktLine(t *testing.T) {
	var buf bytes.Buffer
	writePktLine(&buf, "hello")
	got := buf.String()
	if len(got) < 4 {
		t.Fatalf("pkt-line too short: %q", got)
	}
	// First 4 chars are hex length (including the 4-char prefix).
	wantLen := 4 + len("hello")
	if len(got) != wantLen {
		t.Errorf("pkt-line length = %d, want %d (%q)", len(got), wantLen, got)
	}
}

func TestWriteFlushPkt(t *testing.T) {
	var buf bytes.Buffer
	writeFlushPkt(&buf)
	if buf.String() != "0000" {
		t.Errorf("flush pkt = %q, want 0000", buf.String())
	}
}

func FuzzParseGitURL(f *testing.F) {
	seeds := []string{
		"/myproject.git/info/refs",
		"/parent/child.git/git-upload-pack",
		"not-a-git-url",
		"/.git/",
	}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, path string) {
		parseGitURL(path) // must not panic
	})
}
