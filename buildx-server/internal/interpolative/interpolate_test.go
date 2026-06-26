package interpolative_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/interpolative"
)

func TestInterpolate(t *testing.T) {
	vars := interpolative.Vars{
		Build: map[string]string{
			"job_name": "build",
		},
		Params: map[string]string{
			"env": "prod",
		},
		Props: map[string]string{
			"cluster": "east",
		},
	}

	tests := []struct {
		in, want string
	}{
		{"", ""},
		{"server-shell", "server-shell"},
		{"@job_name@", "build"},
		{"exec-@param:env@", "exec-prod"},
		{"@property:cluster@", "east"},
		{"@@literal", "@literal"},
		{"@unknown@", "@unknown@"},
	}
	for _, tc := range tests {
		got := interpolative.Interpolate(tc.in, vars)
		if got != tc.want {
			t.Errorf("Interpolate(%q) = %q, want %q", tc.in, got, tc.want)
		}
	}
}

func TestBuildVarsFromJobContext_branch(t *testing.T) {
	v := interpolative.BuildVarsFromJobContext("my/proj", "ci", "refs/heads/main", "abc", 3, "tok", nil, nil)
	if v.Build["branch"] != "main" {
		t.Fatalf("branch: got %q", v.Build["branch"])
	}
	if v.Build["project_path"] != "my/proj" {
		t.Fatalf("project_path: got %q", v.Build["project_path"])
	}
}
