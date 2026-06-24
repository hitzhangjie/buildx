package build_test

import (
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
)

func TestBuildStatusConstants(t *testing.T) {
	tests := []struct {
		name string
		got  build.BuildStatus
		want build.BuildStatus
	}{
		{"Pending", build.StatusPending, "pending"},
		{"Running", build.StatusRunning, "running"},
		{"Successful", build.StatusSuccessful, "successful"},
		{"Failed", build.StatusFailed, "failed"},
		{"Cancelled", build.StatusCancelled, "cancelled"},
	}
	for _, tc := range tests {
		if tc.got != tc.want {
			t.Errorf("%s = %q, want %q", tc.name, tc.got, tc.want)
		}
	}
}

func TestBuildStruct(t *testing.T) {
	b := build.Build{
		ID:        1,
		ProjectID: 2,
		Number:    1,
		Job:       "test",
		Status:    build.StatusPending,
		Branch:    "main",
	}
	if b.Status != build.StatusPending {
		t.Error("Status should be pending")
	}
}
