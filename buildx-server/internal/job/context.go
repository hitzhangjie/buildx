package job

import (
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// NewJobContext creates an executor.JobContext from a Build and Job definition.
// This prepares the runtime context needed for executor.Execute().
//
// Maps to the portion of OneDev's DefaultJobService that assembles JobContext
// (called JobContext in OneDev) before invoking the executor.
func NewJobContext(build *model.Build, job *buildspec.Job, projectDir string) (*executor.JobContext, error) {
	if build == nil {
		return nil, fmt.Errorf("build is nil")
	}
	if job == nil {
		return nil, fmt.Errorf("job is nil")
	}

	// Build environment variables from job properties
	envVars := make(map[string]string)
	envVars["BUILDX_BUILD_ID"] = fmt.Sprintf("%d", build.ID)
	envVars["BUILDX_BUILD_NUMBER"] = fmt.Sprintf("%d", build.Number)
	envVars["BUILDX_JOB_NAME"] = build.JobName
	envVars["BUILDX_COMMIT_HASH"] = build.CommitHash
	envVars["BUILDX_REF_NAME"] = build.RefName
	envVars["BUILDX_PROJECT_ID"] = fmt.Sprintf("%d", build.ProjectID)

	// Build parameter map from BuildParams
	paramMap := make(map[string]string)
	// Note: Build's ParamMap is typically assembled at submit time from user params
	// and stored as BuildParam records. Here we include job's default param specs.
	for _, ps := range job.ParamSpecs {
		if ps != nil {
			paramMap[ps.GetName()] = "" // default empty; overridden at submit time
		}
	}

	timeout := job.Timeout
	if timeout <= 0 {
		timeout = buildspec.DefaultTimeout
	}

	return &executor.JobContext{
		BuildID:           build.ID,
		BuildNumber:       build.Number,
		ProjectID:         build.ProjectID,
		ProjectPath:       "", // populated by caller if available
		JobName:           build.JobName,
		JobToken:          build.Token,
		CommitHash:        build.CommitHash,
		RefName:           build.RefName,
		WorkDir:           projectDir,
		AgentID:           0,
		AgentName:         "",
		EnvVars:           envVars,
		ParamMap:          paramMap,
		Timeout:           timeout,
		PreferredExecutor: job.JobExecutor,
	}, nil
}

// NewJobContextWithParams creates a JobContext with explicit parameter values,
// overriding any defaults from the job definition.
func NewJobContextWithParams(build *model.Build, job *buildspec.Job, projectDir string, params map[string]string) (*executor.JobContext, error) {
	ctx, err := NewJobContext(build, job, projectDir)
	if err != nil {
		return nil, err
	}
	for k, v := range params {
		ctx.ParamMap[k] = v
		ctx.EnvVars["BUILDX_PARAM_"+k] = v
	}
	return ctx, nil
}
