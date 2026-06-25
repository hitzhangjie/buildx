package job

import (
	"context"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

const defaultSchedulerInterval = 5 * time.Second

// StartScheduler runs the leader scheduling loop that picks WAITING/PENDING builds and
// executes them. Maps to DefaultJobService.run polling for executable builds.
func (s *Service) StartScheduler(ctx context.Context) {
	go s.runScheduler(ctx)
}

func (s *Service) runScheduler(ctx context.Context) {
	ticker := time.NewTicker(defaultSchedulerInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			s.pollUnfinishedBuilds(ctx)
		}
	}
}

func (s *Service) pollUnfinishedBuilds(ctx context.Context) {
	waiting, err := s.buildStore.Query(ctx, build.QueryFilter{Status: string(model.BuildStatusWaiting)}, 0, 50)
	if err == nil {
		for _, b := range waiting {
			s.promoteWaitingBuild(ctx, b.ID)
		}
	}
	s.pollPendingBuilds(ctx)
}

func (s *Service) promoteWaitingBuild(ctx context.Context, buildID int64) {
	build, err := s.buildStore.Get(ctx, buildID)
	if err != nil || build.Status != model.BuildStatusWaiting {
		return
	}
	deps, err := s.buildStore.ListDependencies(ctx, buildID)
	if err != nil {
		return
	}
	if len(deps) == 0 {
		now := time.Now().UTC()
		_ = s.buildStore.UpdateStatus(ctx, buildID, model.BuildStatusPending)
		_ = s.buildStore.UpdateDates(ctx, buildID, &now, nil, nil)
		return
	}
	for _, dep := range deps {
		if dep.DependencyID == 0 {
			return
		}
		depBuild, err := s.buildStore.Get(ctx, dep.DependencyID)
		if err != nil {
			return
		}
		sm := NewBuildStateMachine(depBuild)
		if !sm.IsTerminal() {
			return
		}
		if dep.RequireSuccessful && depBuild.Status != model.BuildStatusSuccessful {
			now := time.Now().UTC()
			_ = s.buildStore.UpdateStatus(ctx, buildID, model.BuildStatusFailed)
			_ = s.buildStore.UpdateDates(ctx, buildID, nil, nil, &now)
			return
		}
	}
	now := time.Now().UTC()
	_ = s.buildStore.UpdateStatus(ctx, buildID, model.BuildStatusPending)
	_ = s.buildStore.UpdateDates(ctx, buildID, &now, nil, nil)
}

func (s *Service) pollPendingBuilds(ctx context.Context) {
	filter := build.QueryFilter{Status: string(model.BuildStatusPending)}
	builds, err := s.buildStore.Query(ctx, filter, 0, 50)
	if err != nil {
		return
	}
	for _, b := range builds {
		s.tryScheduleBuild(ctx, b.ID)
	}
}

func (s *Service) tryScheduleBuild(ctx context.Context, buildID int64) {
	s.mu.Lock()
	if s.scheduling[buildID] {
		s.mu.Unlock()
		return
	}
	s.scheduling[buildID] = true
	s.mu.Unlock()

	go func() {
		defer func() {
			s.mu.Lock()
			delete(s.scheduling, buildID)
			s.mu.Unlock()
		}()

		build, err := s.buildStore.Get(ctx, buildID)
		if err != nil || build.Status != model.BuildStatusPending {
			return
		}

		s.mu.RLock()
		_, alreadyRunning := s.runningJobs[build.Token]
		s.mu.RUnlock()
		if alreadyRunning {
			return
		}

		spec, _, err := s.loadBuildSpec(ctx, build.ProjectID, build.CommitHash, build.RefName)
		if err != nil {
			return
		}
		jobMap := spec.GetJobMap()
		job, ok := jobMap[build.JobName]
		if !ok || job == nil {
			return
		}
		job.Defaults()

		s.runBuild(ctx, build, job)
	}()
}
