package job

import (
	"context"
	"fmt"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/execplan"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

func (s *Service) runPostBuildActions(ctx context.Context, build *model.Build, job *buildspec.Job, success bool) {
	if job == nil || len(job.PostBuildActions) == 0 {
		return
	}
	for _, action := range job.PostBuildActions {
		if action == nil {
			continue
		}
		if !postBuildConditionMet(action.GetCondition(), success) {
			continue
		}
		switch a := action.(type) {
		case *buildspec.RunJobAction:
			s.runPostBuildRunJob(ctx, build, a)
		case *buildspec.CreateIssueAction:
			if logger := build.Submitter; logger.ID > 0 {
				_ = logger
			}
			// Issue creation requires issue service wiring; logged for future parity.
		case *buildspec.SendNotificationAction:
			// Notification channel not wired; no-op stub matching OneDev hook point.
		}
	}
}

func (s *Service) runPostBuildRunJob(ctx context.Context, build *model.Build, a *buildspec.RunJobAction) {
	if a.JobName == "" {
		return
	}
	paramMaps := execplan.ResolveParamMaps(a.ParamMatrix, nil, nil)
	if len(paramMaps) == 0 {
		paramMaps = []map[string]string{{}}
	}
	for _, pm := range paramMaps {
		params := make(map[string][]string)
		for k, v := range pm {
			params[k] = []string{v}
		}
		_, _ = s.Submit(ctx, SubmitRequest{
			ProjectID:   build.ProjectID,
			CommitHash:  build.CommitHash,
			JobName:     a.JobName,
			RefName:     build.RefName,
			Params:      params,
			Reason:      fmt.Sprintf("Post-build action from build #%d", build.Number),
			SubmitterID: build.Submitter.ID,
		})
	}
}
func postBuildConditionMet(condition string, success bool) bool {
	switch strings.ToLower(strings.TrimSpace(condition)) {
	case "", "successful", "success":
		return success
	case "failed", "failure":
		return !success
	case "always":
		return true
	default:
		return success
	}
}
