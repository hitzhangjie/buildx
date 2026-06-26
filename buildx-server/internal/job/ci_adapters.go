package job

import (
	"context"
	"fmt"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
)

// IssuePostBuildAdapter creates issues via issue store.
type IssuePostBuildAdapter struct {
	Store *issue.DBStore
}

func (a *IssuePostBuildAdapter) CreateFromPostBuild(ctx context.Context, projectID, submitterID int64, title, body string) error {
	if a == nil || a.Store == nil {
		return fmt.Errorf("issue store not configured")
	}
	_, err := a.Store.Create(ctx, &model.Issue{
		ProjectID:   projectID,
		Title:       title,
		Description: body,
		Submitter:   &model.User{ID: submitterID},
	})
	return err
}

// PullRequestStepAdapter opens PRs from build server steps.
type PullRequestStepAdapter struct {
	Service *pullrequest.Service
}

func (a *PullRequestStepAdapter) CreateFromBuildStep(ctx context.Context, jobCtx *executor.JobContext, targetBranch, title, body string) error {
	if a == nil || a.Service == nil || jobCtx == nil {
		return fmt.Errorf("pull request service not configured")
	}
	sourceBranch := strings.TrimPrefix(jobCtx.RefName, "refs/heads/")
	if sourceBranch == "" {
		sourceBranch = jobCtx.RefName
	}
	_, err := a.Service.Open(ctx, &model.PullRequestOpenData{
		TargetProjectID: jobCtx.ProjectID,
		SourceProjectID: jobCtx.ProjectID,
		TargetBranch:    targetBranch,
		SourceBranch:    sourceBranch,
		Title:           title,
		Description:     body,
	}, &model.User{ID: model.UserRootID})
	return err
}

func (s *Service) runPostBuildCreateIssue(ctx context.Context, build *model.Build, a *buildspec.CreateIssueAction) {
	if s.issues == nil || build == nil || a == nil {
		return
	}
	title := execplan.InterpolateString(a.TitleTemplate, nil, execplan.LoadSecretsFromEnv())
	body := execplan.InterpolateString(a.BodyTemplate, nil, execplan.LoadSecretsFromEnv())
	submitterID := int64(model.UserRootID)
	if build.Submitter.ID > 0 {
		submitterID = build.Submitter.ID
	}
	_ = s.issues.CreateFromPostBuild(ctx, build.ProjectID, submitterID, title, body)
}
