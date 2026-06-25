package server

import (
	"context"

	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/runtime"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/server/api"
)

type agentStoreAdapter struct {
	store *runtime.DBStore
}

func (a agentStoreAdapter) Get(ctx context.Context, id int64) (*model.Agent, error) {
	return a.store.Get(ctx, id)
}

func (a agentStoreAdapter) GetByName(ctx context.Context, name string) (*model.Agent, error) {
	return a.store.GetByName(ctx, name)
}

func (a agentStoreAdapter) Query(ctx context.Context, filter api.AgentQueryFilter, offset, count int) ([]*model.Agent, error) {
	return a.store.Query(ctx, runtime.AgentQueryFilter{
		Name:     filter.Name,
		Status:   filter.Status,
		OS:       filter.OS,
		OSArch:   filter.OSArch,
		FreeText: filter.FreeText,
	}, offset, count)
}

func (a agentStoreAdapter) Update(ctx context.Context, agent *model.Agent) error {
	return a.store.Update(ctx, agent)
}

func (a agentStoreAdapter) Delete(ctx context.Context, id int64) error {
	return a.store.Delete(ctx, id)
}

func (a agentStoreAdapter) CreateToken(ctx context.Context, agentID int64) (*model.AgentToken, error) {
	return a.store.CreateToken(ctx, agentID)
}

func (a agentStoreAdapter) GetToken(ctx context.Context, agentID int64) (*model.AgentToken, error) {
	return a.store.GetToken(ctx, agentID)
}

func (a agentStoreAdapter) SetAttributes(ctx context.Context, agentID int64, attrs map[string]string) error {
	return a.store.SetAttributes(ctx, agentID, attrs)
}

func (a agentStoreAdapter) GetAttributes(ctx context.Context, agentID int64) (map[string]string, error) {
	return a.store.GetAttributes(ctx, agentID)
}
