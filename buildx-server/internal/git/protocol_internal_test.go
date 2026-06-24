package git

import (
	"testing"

	"github.com/go-git/go-git/v5/plumbing"
)

func TestParseHash(t *testing.T) {
	tests := []struct {
		name string
		in   []byte
		want plumbing.Hash
	}{
		{
			name: "valid 40-char hex",
			in:   []byte("0123456789abcdef0123456789abcdef01234567"),
			want: plumbing.NewHash("0123456789abcdef0123456789abcdef01234567"),
		},
		{
			name: "short input",
			in:   []byte("abc"),
			want: plumbing.ZeroHash,
		},
		{
			name: "non-hex chars",
			in:   []byte("ghijklmnopqrstuvwxghijklmnopqrstuvwx"),
			want: plumbing.ZeroHash,
		},
		{
			name: "empty",
			in:   []byte{},
			want: plumbing.ZeroHash,
		},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := parseHash(tc.in)
			if got != tc.want {
				t.Errorf("parseHash = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestUploadPackCapabilities(t *testing.T) {
	caps := uploadPackCapabilities()
	if caps == nil {
		t.Fatal("uploadPackCapabilities returned nil")
	}
	agent := caps.Get("agent")
	if len(agent) == 0 {
		t.Error("expected agent capability to be set")
	}
}
