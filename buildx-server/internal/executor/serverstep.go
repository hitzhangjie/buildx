package executor

import (
	"context"
	"fmt"
	"os/exec"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// ProjectPathResolver resolves project paths for server steps.
type ProjectPathResolver interface {
	GitDir(projectID int64) string
}

// BuildVersionUpdater updates build metadata from server steps.
type BuildVersionUpdater interface {
	UpdateVersion(ctx context.Context, buildID int64, version string) error
	UpdateDescription(ctx context.Context, buildID int64, description string) error
}

// PullRequestCreator opens pull requests from server steps.
type PullRequestCreator interface {
	CreateFromBuildStep(ctx context.Context, jobCtx *JobContext, targetBranch, title, body string) error
}

// ArtifactPublisher stores build artifacts from the work directory.
type ArtifactPublisher interface {
	PublishArtifacts(ctx context.Context, projectID int64, buildNumber int, workDir, sourcePath, patterns string) error
}

// DefaultServerStepHandler implements server-side steps with injected stores.
type DefaultServerStepHandler struct {
	BuildStore      BuildVersionUpdater
	ArtifactStore   ArtifactPublisher
	GitDir          string
	Projects        ProjectPathResolver
	ReportStore     ReportPublisher
	PullRequests    PullRequestCreator
}

// ReportPublisher stores published test/analysis reports.
type ReportPublisher interface {
	PublishReport(ctx context.Context, projectID int64, buildNumber int, name, reportType, path string) error
}

// RunServerStep executes a single step on the server side.
func RunServerStep(ctx context.Context, step interface{}, jobCtx *JobContext, workDir string, logger TaskLogger) (*ServerStepResult, error) {
	if step == nil {
		return nil, fmt.Errorf("runServerStep: step is nil")
	}
	if jobCtx != nil && jobCtx.ServerSteps != nil {
		if bs, ok := step.(buildspec.Step); ok {
			return jobCtx.ServerSteps.RunServerStep(ctx, bs, jobCtx, workDir, logger)
		}
	}
	return runServerStepBuiltin(ctx, step, jobCtx, workDir, logger)
}

func (h *DefaultServerStepHandler) RunServerStep(ctx context.Context, step buildspec.Step, jobCtx *JobContext, workDir string, logger TaskLogger) (*ServerStepResult, error) {
	if h == nil {
		return runServerStepBuiltin(ctx, step, jobCtx, workDir, logger)
	}
	switch s := step.(type) {
	case *buildspec.SetBuildVersionStep:
		if h.BuildStore == nil {
			return nil, fmt.Errorf("runServerStep: build store not configured")
		}
		if err := h.BuildStore.UpdateVersion(ctx, jobCtx.BuildID, s.Version); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Logf("info", "build version set to %q", s.Version)
		}
		return &ServerStepResult{Success: true, Outputs: map[string]string{"version": s.Version}}, nil

	case *buildspec.SetBuildDescriptionStep:
		if h.BuildStore == nil {
			return nil, fmt.Errorf("runServerStep: build store not configured")
		}
		if err := h.BuildStore.UpdateDescription(ctx, jobCtx.BuildID, s.BuildDescription); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Log("info", "build description updated")
		}
		return &ServerStepResult{Success: true}, nil

	case *buildspec.CreatePullRequestStep:
		if h.PullRequests == nil {
			return &ServerStepResult{Success: false, Message: "pull request service not configured"}, nil
		}
		if err := h.PullRequests.CreateFromBuildStep(ctx, jobCtx, s.TargetBranch, s.PRTitle, s.PRBody); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Logf("info", "pull request created targeting %q", s.TargetBranch)
		}
		return &ServerStepResult{Success: true}, nil

	case *buildspec.PublishArtifactStep:
		if h.ArtifactStore == nil {
			return nil, fmt.Errorf("runServerStep: artifact store not configured")
		}
		if err := h.ArtifactStore.PublishArtifacts(ctx, jobCtx.ProjectID, jobCtx.BuildNumber, workDir, s.SourcePath, s.Artifacts); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Log("info", "artifacts published")
		}
		return &ServerStepResult{Success: true}, nil

	case *buildspec.PublishReportStep:
		if h.ReportStore != nil {
			reportPath := s.Path
			if reportPath != "" && workDir != "" {
				reportPath = workDir + "/" + reportPath
			}
			if err := h.ReportStore.PublishReport(ctx, jobCtx.ProjectID, jobCtx.BuildNumber, s.ReportName, s.ReportType, reportPath); err != nil {
				return &ServerStepResult{Success: false, Message: err.Error()}, nil
			}
		} else if logger != nil {
			logger.Logf("info", "report %q registered (type %s)", s.ReportName, s.ReportType)
		}
		return &ServerStepResult{Success: true}, nil

	case *buildspec.CreateBranchStep:
		gitDir := h.gitDirFor(jobCtx)
		if gitDir == "" {
			return &ServerStepResult{Success: false, Message: "git directory not configured"}, nil
		}
		if err := createGitRef(ctx, gitDir, "branch", s.BranchName, jobCtx.CommitHash, s.CommitMessage); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Logf("info", "branch %q created", s.BranchName)
		}
		return &ServerStepResult{Success: true}, nil

	case *buildspec.CreateTagStep:
		gitDir := h.gitDirFor(jobCtx)
		if gitDir == "" {
			return &ServerStepResult{Success: false, Message: "git directory not configured"}, nil
		}
		if err := createGitRef(ctx, gitDir, "tag", s.TagName, jobCtx.CommitHash, s.Message); err != nil {
			return &ServerStepResult{Success: false, Message: err.Error()}, nil
		}
		if logger != nil {
			logger.Logf("info", "tag %q created", s.TagName)
		}
		return &ServerStepResult{Success: true}, nil

	default:
		return runServerStepBuiltin(ctx, step, jobCtx, workDir, logger)
	}
}

func (h *DefaultServerStepHandler) gitDirFor(jobCtx *JobContext) string {
	if h.GitDir != "" {
		return h.GitDir
	}
	if h.Projects != nil && jobCtx != nil {
		return h.Projects.GitDir(jobCtx.ProjectID)
	}
	if jobCtx != nil {
		return jobCtx.GitDir
	}
	return ""
}

func createGitRef(ctx context.Context, gitDir, kind, name, commitHash, message string) error {
	if name == "" || commitHash == "" {
		return fmt.Errorf("ref name and commit are required")
	}
	switch kind {
	case "branch":
		cmd := exec.CommandContext(ctx, "git", "-C", gitDir, "branch", name, commitHash)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("git branch: %s: %w", string(out), err)
		}
		return nil
	case "tag":
		args := []string{"-C", gitDir, "tag", name, commitHash}
		if message != "" {
			args = []string{"-C", gitDir, "tag", "-a", name, commitHash, "-m", message}
		}
		cmd := exec.CommandContext(ctx, "git", args...)
		if out, err := cmd.CombinedOutput(); err != nil {
			return fmt.Errorf("git tag: %s: %w", string(out), err)
		}
		return nil
	default:
		return fmt.Errorf("unknown ref kind %q", kind)
	}
}

func runServerStepBuiltin(ctx context.Context, step interface{}, jobCtx *JobContext, workDir string, logger TaskLogger) (*ServerStepResult, error) {
	if logger != nil {
		logger.Logf("info", "running server step: %T", step)
	}
	return nil, fmt.Errorf("runServerStep: unsupported step type %T", step)
}
