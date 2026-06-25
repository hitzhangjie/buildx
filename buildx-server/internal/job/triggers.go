package job

import (
	"context"
	"fmt"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// RefUpdateEvent describes a git ref update for trigger matching.
type RefUpdateEvent struct {
	ProjectID   int64
	CommitHash  string
	RefName     string
	OldCommit   string
	ChangedFiles []string
	SubmitterID int64
}

// OnRefUpdated matches branch-update triggers and submits builds.
func (s *Service) OnRefUpdated(ctx context.Context, ev RefUpdateEvent) ([]*model.Build, error) {
	spec, _, err := s.loadBuildSpec(ctx, ev.ProjectID, ev.CommitHash, ev.RefName)
	if err != nil {
		return nil, err
	}
	eventType := "push"
	if strings.HasPrefix(ev.RefName, "refs/tags/") {
		eventType = "tag"
	}
	refName := git.ShortRefName(ev.RefName)
	matches := EvaluateTriggers(spec, &MatchContext{
		ProjectID:     ev.ProjectID,
		RefName:       refName,
		CommitHash:    ev.CommitHash,
		OldCommitHash: ev.OldCommit,
		EventType:     eventType,
		Files:         ev.ChangedFiles,
	})
	var builds []*model.Build
	for _, m := range matches {
		b, err := s.Submit(ctx, SubmitRequest{
			ProjectID:   ev.ProjectID,
			CommitHash:  ev.CommitHash,
			JobName:     m.JobName,
			RefName:     refName,
			Params:      m.Params,
			Reason:      m.Reason,
			SubmitterID: ev.SubmitterID,
		})
		if err != nil {
			return builds, fmt.Errorf("submit job %q: %w", m.JobName, err)
		}
		builds = append(builds, b)
	}
	s.cacheSchedulesAfterRef(ctx, ev.ProjectID, refName, ev.CommitHash)
	return builds, nil
}
func (s *Service) OnPullRequestUpdated(ctx context.Context, projectID int64, commitHash, refName string, changedFiles []string, submitterID int64) ([]*model.Build, error) {
	spec, _, err := s.loadBuildSpec(ctx, projectID, commitHash, refName)
	if err != nil {
		return nil, err
	}
	matches := EvaluateTriggers(spec, &MatchContext{
		ProjectID:  projectID,
		RefName:    refName,
		CommitHash: commitHash,
		EventType:  "pr-update",
		Files:      changedFiles,
	})
	var builds []*model.Build
	for _, m := range matches {
		b, err := s.Submit(ctx, SubmitRequest{
			ProjectID:   projectID,
			CommitHash:  commitHash,
			JobName:     m.JobName,
			RefName:     refName,
			Reason:      m.Reason,
			SubmitterID: submitterID,
		})
		if err != nil {
			return builds, err
		}
		builds = append(builds, b)
	}
	return builds, nil
}

// notifyDependencyFinished submits jobs with DependencyFinishedTrigger when a build completes.
func (s *Service) notifyDependencyFinished(ctx context.Context, finished *model.Build) {
	spec, _, err := s.loadBuildSpec(ctx, finished.ProjectID, finished.CommitHash, finished.RefName)
	if err != nil {
		return
	}
	for _, jobDef := range spec.Jobs {
		for _, tr := range jobDef.Triggers {
			dt, ok := tr.(*buildspec.DependencyFinishedTrigger)
			if !ok {
				continue
			}
			match := false
			for _, jn := range dt.JobNames {
				if jn == finished.JobName {
					match = true
					break
				}
			}
			if !match && len(dt.JobNames) > 0 {
				continue
			}
			_, _ = s.Submit(ctx, SubmitRequest{
				ProjectID:   finished.ProjectID,
				CommitHash:  finished.CommitHash,
				JobName:     jobDef.Name,
				RefName:     finished.RefName,
				Reason:      fmt.Sprintf("Dependency finished: %s", finished.JobName),
				SubmitterID: finished.Submitter.ID,
			})
		}
	}
}
