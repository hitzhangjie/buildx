package config

import "testing"

func TestNormalizeListenAddr(t *testing.T) {
	tests := []struct {
		in   string
		want string
	}{
		{":6666", ":6666"},
		{"6666", ":6666"},
		{"0.0.0.0:6666", "0.0.0.0:6666"},
		{"127.0.0.1:8080", "127.0.0.1:8080"},
	}
	for _, tc := range tests {
		got, err := normalizeListenAddr(tc.in)
		if err != nil {
			t.Fatalf("normalizeListenAddr(%q): %v", tc.in, err)
		}
		if got != tc.want {
			t.Fatalf("normalizeListenAddr(%q) = %q, want %q", tc.in, got, tc.want)
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
