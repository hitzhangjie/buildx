package resource_test

import (
	"context"
	"testing"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/resource"
)

type stubAgents struct {
	online []int64
	byID   map[int64]*model.Agent
}

func (s *stubAgents) FindAgent(_ context.Context, id int64) (*model.Agent, error) {
	return s.byID[id], nil
}

func (s *stubAgents) GetOnlineAgents(context.Context) ([]int64, error) {
	return s.online, nil
}

func TestAllocateAgentRespectsPausedAndAttributes(t *testing.T) {
	agents := &stubAgents{
		online: []int64{1, 2},
		byID: map[int64]*model.Agent{
			1: {ID: 1, Name: "a1", Online: true, Paused: true},
			2: {ID: 2, Name: "gpu", Online: true, Attributes: map[string]string{"gpu": "true"}},
		},
	}
	svc := resource.NewService(agents)
	id, err := svc.AllocateAgent(context.Background(), `attribute gpu=true`, "remote-shell", 1)
	if err != nil {
		t.Fatal(err)
	}
	if id != 2 {
		t.Fatalf("got agent %d, want 2", id)
	}
	svc.ReleaseAgent(id, "remote-shell")
}

func TestMatchesAgentQuery(t *testing.T) {
	agent := &model.Agent{Name: "worker-1", Online: true, Attributes: map[string]string{"os": "linux"}}
	if !resource.MatchesAgentQuery(agent, `name "worker-1"`) {
		t.Fatal("expected name match")
	}
	if resource.MatchesAgentQuery(agent, `attribute os=windows`) {
		t.Fatal("expected attribute mismatch")
	}
}
