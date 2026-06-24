package config

import (
	"os"
	"testing"
)

func TestNormalizeListenAddr(t *testing.T) {
	tests := []struct {
		in      string
		want    string
		wantErr bool
	}{
		{":9910", ":9910", false},
		{"9910", ":9910", false},
		{"0.0.0.0:9910", "0.0.0.0:9910", false},
		{"127.0.0.1:8080", "127.0.0.1:8080", false},
		{"  :9910  ", ":9910", false},
		{"", "", true},
		{"abc", "", true},
		{"999999", "", true},
		{"-1", "", true},
		{"0", "", true},
		{"65536", "", true},
	}
	for _, tc := range tests {
		got, err := normalizeListenAddr(tc.in)
		if tc.wantErr {
			if err == nil {
				t.Errorf("normalizeListenAddr(%q) expected error", tc.in)
			}
			continue
		}
		if err != nil {
			t.Errorf("normalizeListenAddr(%q): %v", tc.in, err)
			continue
		}
		if got != tc.want {
			t.Errorf("normalizeListenAddr(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestLoadUsesHTTPAddrEnv(t *testing.T) {
	t.Setenv("BUILDX_HTTP_ADDR", "127.0.0.1:18080")
	t.Setenv("BUILDX_DATA_DIR", t.TempDir())

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPAddr != "127.0.0.1:18080" {
		t.Fatalf("HTTPAddr = %q, want 127.0.0.1:18080", cfg.HTTPAddr)
	}
}

func TestEnvBool(t *testing.T) {
	tests := []struct {
		env      string
		fallback bool
		want     bool
	}{
		{"", true, true},
		{"", false, false},
		{"true", false, true},
		{"1", false, true},
		{"false", true, false},
		{"0", true, false},
		{"invalid", true, true},
		{"invalid", false, false},
	}
	for _, tc := range tests {
		if tc.env != "" {
			t.Setenv("TEST_ENV_BOOL", tc.env)
		}
		got := envBool("TEST_ENV_BOOL", tc.fallback)
		if got != tc.want {
			t.Errorf("envBool(env=%q, fallback=%v) = %v, want %v", tc.env, tc.fallback, got, tc.want)
		}
	}
}

func TestEnvOr(t *testing.T) {
	t.Setenv("TEST_ENV_STR", "custom")
	got := envOr("TEST_ENV_STR", "default")
	if got != "custom" {
		t.Errorf("envOr = %q, want %q", got, "custom")
	}

	got = envOr("NONEXISTENT_ENV_XYZ", "default")
	if got != "default" {
		t.Errorf("envOr fallback = %q, want %q", got, "default")
	}
}

func TestRevalidate(t *testing.T) {
	cfg := &Config{
		HTTPAddr: "127.0.0.1:18080",
		SSHAddr:  ":19911",
		DataDir:  t.TempDir(),
	}
	if err := cfg.Revalidate(); err != nil {
		t.Fatalf("Revalidate: %v", err)
	}
}

func TestNormalizeAndPrepare_createsDir(t *testing.T) {
	dir := t.TempDir() + "/newsub"
	cfg := &Config{
		HTTPAddr: ":19910",
		SSHAddr:  ":19911",
		DataDir:  dir,
	}
	if err := cfg.Revalidate(); err != nil {
		t.Fatalf("Revalidate: %v", err)
	}
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		t.Error("DataDir was not created")
	}
}

func TestLoad_allEnvVars(t *testing.T) {
	t.Setenv("BUILDX_HTTP_ADDR", ":18080")
	t.Setenv("BUILDX_SSH_ADDR", ":18022")
	t.Setenv("BUILDX_DATA_DIR", t.TempDir())
	t.Setenv("BUILDX_WEB_DIR", "/tmp/web")
	t.Setenv("BUILDX_DEV", "true")

	cfg, err := Load()
	if err != nil {
		t.Fatal(err)
	}
	if cfg.HTTPAddr != ":18080" {
		t.Errorf("HTTPAddr = %q", cfg.HTTPAddr)
	}
	if cfg.SSHAddr != ":18022" {
		t.Errorf("SSHAddr = %q", cfg.SSHAddr)
	}
	if cfg.WebDir != "/tmp/web" {
		t.Errorf("WebDir = %q", cfg.WebDir)
	}
	if !cfg.Dev {
		t.Error("Dev should be true")
	}
}

func FuzzNormalizeListenAddr(f *testing.F) {
	seeds := []string{":9910", "9910", "0.0.0.0:9910", "", "abc", "999999"}
	for _, s := range seeds {
		f.Add(s)
	}
	f.Fuzz(func(t *testing.T, addr string) {
		normalizeListenAddr(addr) // must not panic
	})
}
