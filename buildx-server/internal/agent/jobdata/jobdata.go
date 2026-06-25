// Package jobdata defines job payloads exchanged between server and build agents.
package jobdata

import "github.com/hitzhangjie/buildx/buildx-server/internal/execplan"

// ShellJobData is the execution payload for remote shell agents.
// Maps to io.onedev.agent.job.ShellJobData (JSON encoding in BuildX).
type ShellJobData struct {
	JobToken     string         `json:"jobToken"`
	ExecutorName string         `json:"executorName"`
	ProjectPath  string         `json:"projectPath"`
	ProjectID    int64          `json:"projectId"`
	RefName      string         `json:"refName"`
	CommitHash   string         `json:"commitHash"`
	BuildNumber  int            `json:"buildNumber"`
	BuildID      int64          `json:"buildId"`
	Plan         *execplan.Plan `json:"plan"`
	TimeoutSec   int64          `json:"timeoutSec"`
}

// JobResult is returned by an agent when job execution completes.
type JobResult struct {
	JobToken string              `json:"jobToken"`
	Success  bool                `json:"success"`
	Steps    []JobStepResult     `json:"steps,omitempty"`
	Error    string              `json:"error,omitempty"`
}

// JobStepResult mirrors executor.StepResult for agent responses.
type JobStepResult struct {
	Name       string `json:"name"`
	Success    bool   `json:"success"`
	ExitCode   int    `json:"exitCode"`
	DurationMs int64  `json:"durationMs"`
	Error      string `json:"error,omitempty"`
}
