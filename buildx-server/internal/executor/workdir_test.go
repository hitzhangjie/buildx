package executor_test

import (
	"path/filepath"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

func TestBuildWorkDir(t *testing.T) {
	t.Helper()
	base := "/data/builds"

	tests := []struct {
		name string
		jc   *executor.JobContext
		want string
	}{
		{
			name: "id-name layout",
			jc: &executor.JobContext{
				ProjectID:   1,
				ProjectName: "buildx",
				JobID:       1,
				JobName:     "job1",
				BuildNumber: 8,
			},
			want: filepath.Join(base, "1-buildx", "1-job1", "8"),
		},
		{
			name: "fallback project path when name empty",
			jc: &executor.JobContext{
				ProjectID:   3,
				ProjectPath: "parent/child",
				JobID:       2,
				JobName:     "ci",
				BuildNumber: 4,
			},
			want: filepath.Join(base, "3-child", "2-ci", "4"),
		},
		{
			name: "fallback without ids",
			jc: &executor.JobContext{
				JobName:     "test",
				BuildNumber: 1,
			},
			want: filepath.Join(base, "project", "test", "1"),
		},
		{
			name: "sanitize job name",
			jc: &executor.JobContext{
				ProjectID:   1,
				ProjectName: "buildx",
				JobID:       1,
				JobName:     "my job!",
				BuildNumber: 2,
			},
			want: filepath.Join(base, "1-buildx", "1-my_job", "2"),
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := executor.BuildWorkDir(base, tc.jc)
			if got != tc.want {
				t.Fatalf("BuildWorkDir() = %q, want %q", got, tc.want)
			}
		})
	}
}
