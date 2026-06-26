package execplan_test

import (
	"os"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
)

func TestInterpolateString(t *testing.T) {
	t.Setenv("BUILDX_SECRET_TOKEN", "sekret")
	got := execplan.InterpolateString(
		"hello @param:version@ @secret:token@",
		map[string]string{"version": "1.2"},
		nil,
	)
	if got != "hello 1.2 sekret" {
		t.Fatalf("got %q", got)
	}
}

func TestLoadSecretsFromEnv(t *testing.T) {
	t.Setenv("BUILDX_SECRET_API_KEY", "abc")
	secrets := execplan.LoadSecretsFromEnv()
	if secrets["api_key"] != "abc" {
		t.Fatalf("secrets = %#v", secrets)
	}
	os.Unsetenv("BUILDX_SECRET_API_KEY")
}
