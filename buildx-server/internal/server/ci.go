package server

import (
	"context"
	"log/slog"
	"path/filepath"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/dialer"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/runtime"
	"github.com/hitzhangjie/buildx/buildx-server/internal/artifact"
	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/cache"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/issue"
	"github.com/hitzhangjie/buildx/buildx-server/internal/job"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/project"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
	"github.com/hitzhangjie/buildx/buildx-server/internal/resource"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
	"github.com/hitzhangjie/buildx/buildx-server/internal/worker"
)

// jobAdapter bridges job.Service to api.JobService and api.LogService.
type jobAdapter struct {
	svc *job.Service
}

func (a jobAdapter) Submit(ctx context.Context, req api.SubmitRequest) (*model.Build, error) {
	return a.svc.Submit(ctx, job.SubmitRequest{
		ProjectID:     req.ProjectID,
		CommitHash:    req.CommitHash,
		JobName:       req.JobName,
		RefName:       req.RefName,
		Params:        req.Params,
		Reason:        req.Reason,
		PullRequestID: req.PRID,
		IssueID:       req.IssueID,
	})
}

func (a jobAdapter) Resubmit(ctx context.Context, buildID int64, reason string) (*model.Build, error) {
	return a.svc.Resubmit(ctx, buildID, reason)
}

func (a jobAdapter) Cancel(ctx context.Context, buildID int64) error {
	return a.svc.Cancel(ctx, buildID)
}

func (a jobAdapter) Pause(ctx context.Context, buildID int64) error {
	return a.svc.Pause(ctx, buildID)
}

func (a jobAdapter) Resume(ctx context.Context, buildID int64) error {
	return a.svc.Resume(ctx, buildID)
}

func (a jobAdapter) GetLog(ctx context.Context, buildID int64) ([]api.LogEntry, error) {
	entries, err := a.svc.GetLog(ctx, buildID, time.Time{})
	if err != nil {
		return nil, err
	}
	out := make([]api.LogEntry, len(entries))
	for i, e := range entries {
		out[i] = api.LogEntry{
			ID:        e.ID,
			BuildID:   e.BuildID,
			Timestamp: e.Timestamp,
			Level:     e.Level,
			Message:   e.Message,
			StepName:  e.StepName,
		}
	}
	return out, nil
}

func (a jobAdapter) StreamLog(ctx context.Context, buildID int64) (<-chan api.LogEntry, error) {
	in, err := a.svc.StreamLog(ctx, buildID)
	if err != nil {
		return nil, err
	}
	out := make(chan api.LogEntry)
	go func() {
		defer close(out)
		for e := range in {
			select {
			case <-ctx.Done():
				return
			case out <- api.LogEntry{
				ID:        e.ID,
				BuildID:   e.BuildID,
				Timestamp: e.Timestamp,
				Level:     e.Level,
				Message:   e.Message,
				StepName:  e.StepName,
			}:
			}
		}
	}()
	return out, nil
}

func (a jobAdapter) NotifyRefUpdated(ctx context.Context, projectID int64, refName, oldCommit, newCommit string, submitterID int64, changedFiles []string) {
	go func() {
		bg := context.WithoutCancel(ctx)
		if _, err := a.svc.OnRefUpdated(bg, job.RefUpdateEvent{
			ProjectID:    projectID,
			CommitHash:   newCommit,
			RefName:      refName,
			OldCommit:    oldCommit,
			ChangedFiles: changedFiles,
			SubmitterID:  submitterID,
		}); err != nil {
			slog.Error("ci ref trigger failed", "project_id", projectID, "ref", refName, "error", err)
		}
	}()
}

func (a jobAdapter) NotifyPullRequestUpdated(ctx context.Context, projectID int64, commitHash, refName string, changedFiles []string, submitterID int64) {
	go func() {
		bg := context.WithoutCancel(ctx)
		if _, err := a.svc.OnPullRequestUpdated(bg, projectID, commitHash, refName, changedFiles, submitterID); err != nil {
			slog.Error("ci pr trigger failed", "project_id", projectID, "ref", refName, "error", err)
		}
	}()
}

type ciBundle struct {
	jobs          jobAdapter
	agentStore    agentStoreAdapter
	agentRuntime  *runtime.Service
	agentWS       *runtime.AgentWebSocket
	worker        *worker.Handler
	artifactStore *artifact.Store
	registry      *executor.Registry
}

func (s *Server) wireCI(projects *project.DBStore, buildsStore *build.DBStore) ciBundle {
	workBase := filepath.Join(s.cfg.DataDir, "builds")
	cacheBase := filepath.Join(s.cfg.DataDir, "cache")
	artifactBase := filepath.Join(s.cfg.DataDir, "artifacts")
	logBase := filepath.Join(s.cfg.DataDir, "logs")

	cacheSvc := cache.NewService(cacheBase)
	artifactStore := artifact.NewStore(artifactBase)

	agentStore := runtime.NewDBStore(s.store.DB())
	agentRuntime := runtime.NewService(agentStore)
	agentWS := runtime.NewAgentWebSocket(agentRuntime)
	agentDialer := dialer.NewWebSocketDialer(agentRuntime)

	agentAdapter := job.NewAgentServiceAdapter(agentStore, agentRuntime)
	resourceSvc := resource.NewService(agentAdapter)

	registry := executor.NewRegistry()
	defaultMatch := "*"
	registry.Register(executor.NewServerShellExecutor(workBase), &executor.ExecutorConfig{
		Name: "server-shell", Enabled: true, JobMatch: defaultMatch,
	})
	if dockerExec := executor.NewDockerExecutor(workBase); dockerExec.Enabled() {
		registry.Register(dockerExec, &executor.ExecutorConfig{
			Name: "server-docker", Enabled: true, JobMatch: defaultMatch,
		})
	}
	if k8sExec := executor.NewKubernetesExecutor(workBase); k8sExec.Enabled() {
		registry.Register(k8sExec, &executor.ExecutorConfig{
			Name: "kubernetes", Enabled: true, JobMatch: defaultMatch,
		})
	}
	registry.Register(executor.NewRemoteShellExecutor(agentDialer), &executor.ExecutorConfig{
		Name: "remote-shell", Enabled: true, JobMatch: defaultMatch,
	})
	registry.Register(executor.NewRemoteDockerExecutor(agentDialer), &executor.ExecutorConfig{
		Name: "remote-docker", Enabled: true, JobMatch: defaultMatch,
	})

	issueStore := issue.NewDBStore(s.store.DB())
	prStore := pullrequest.NewDBStore(s.store.DB())
	prService := &pullrequest.Service{Store: prStore, Project: projects}

	fileLogs := job.NewFileLogReader(logBase)

	svc := job.NewService(
		buildsStore,
		agentAdapter,
		registry,
		projects,
		git.CIService{},
		fileLogs,
	)
	svc.SetCacheAndArtifacts(cacheSvc, artifactStore)
	svc.SetLogPersistDir(logBase)
	svc.SetResourceService(resourceSvc)
	svc.SetIssueCreator(&job.IssuePostBuildAdapter{Store: issueStore})
	svc.SetPullRequestStepService(&job.PullRequestStepAdapter{Service: prService})
	svc.SetRemoteAgentQuery("", 1)

	agentRuntime.SetBuildLogForwarder(func(jobToken, level, message string) {
		svc.ForwardAgentBuildLog(jobToken, level, message)
	})
	s.jobs = svc

	return ciBundle{
		jobs:          jobAdapter{svc: svc},
		agentStore:    agentStoreAdapter{store: agentStore},
		agentRuntime:  agentRuntime,
		agentWS:       agentWS,
		worker:        worker.NewHandler(svc, cacheSvc),
		artifactStore: artifactStore,
		registry:      registry,
	}
}
