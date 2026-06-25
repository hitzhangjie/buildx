package job

import (
	"context"
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/runtime"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// agentServiceAdapter bridges agent runtime to job.AgentService.
type agentServiceAdapter struct {
	runtime *runtime.Service
	store   *runtime.DBStore
}

func NewAgentServiceAdapter(store *runtime.DBStore, svc *runtime.Service) AgentService {
	return &agentServiceAdapter{runtime: svc, store: store}
}

func newAgentServiceAdapter(store *runtime.DBStore, svc *runtime.Service) AgentService {
	return NewAgentServiceAdapter(store, svc)
}

func (a *agentServiceAdapter) FindAgent(ctx context.Context, agentID int64) (*model.Agent, error) {
	if a.store == nil {
		return nil, fmt.Errorf("agent store not configured")
	}
	return a.store.Get(ctx, agentID)
}

func (a *agentServiceAdapter) GetOnlineAgents(ctx context.Context) ([]int64, error) {
	if a.runtime == nil {
		return nil, nil
	}
	return a.runtime.GetOnlineAgents(ctx), nil
}

func (a *agentServiceAdapter) Pause(ctx context.Context, agentID int64) error {
	if a.runtime == nil {
		return fmt.Errorf("agent runtime not configured")
	}
	return a.runtime.Pause(ctx, agentID)
}

func (a *agentServiceAdapter) Resume(ctx context.Context, agentID int64) error {
	if a.runtime == nil {
		return fmt.Errorf("agent runtime not configured")
	}
	return a.runtime.Resume(ctx, agentID)
}

func (a *agentServiceAdapter) GetAgentLog(ctx context.Context, agentID int64) ([]string, error) {
	if a.runtime == nil {
		return nil, nil
	}
	entries, err := a.runtime.GetAgentLog(ctx, agentID)
	if err != nil {
		return nil, err
	}
	out := make([]string, 0, len(entries))
	for _, e := range entries {
		out = append(out, e.Message)
	}
	return out, nil
}

// PublishReport implements executor.ReportPublisher.
func (s *Service) PublishReport(ctx context.Context, projectID int64, buildNumber int, name, reportType, path string) error {
	if s.artifacts == nil {
		return nil
	}
	return s.artifacts.PublishReport(ctx, projectID, buildNumber, name, reportType, path)
}
