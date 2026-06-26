// Package resource implements agent allocation with concurrency slots and query
// matching (OneDev ResourceService parity subset).
package resource

import (
	"context"
	"fmt"
	"strings"
	"sync"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// AgentLookup loads agents and lists online session IDs.
type AgentLookup interface {
	FindAgent(ctx context.Context, agentID int64) (*model.Agent, error)
	GetOnlineAgents(ctx context.Context) ([]int64, error)
}

// Service tracks per-agent concurrency and selects agents for remote jobs.
type Service struct {
	agents AgentLookup

	mu       sync.Mutex
	running  map[int64]int            // agentID -> active job count
	byExec   map[string]map[int64]int // executorName -> agentID -> count
}

// NewService creates a resource allocator backed by agent runtime.
func NewService(agents AgentLookup) *Service {
	return &Service{
		agents:  agents,
		running: make(map[int64]int),
		byExec:  make(map[string]map[int64]int),
	}
}

// AllocateAgent picks an online, unpaused agent matching query with a free slot.
func (s *Service) AllocateAgent(ctx context.Context, query, executorName string, concurrency int) (int64, error) {
	if s == nil || s.agents == nil {
		return 0, fmt.Errorf("resource: agent lookup not configured")
	}
	if concurrency <= 0 {
		concurrency = 1
	}
	online, err := s.agents.GetOnlineAgents(ctx)
	if err != nil {
		return 0, err
	}
	if len(online) == 0 {
		return 0, fmt.Errorf("resource: no online agents")
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	for _, id := range online {
		agent, err := s.agents.FindAgent(ctx, id)
		if err != nil || agent == nil {
			continue
		}
		if agent.Paused {
			continue
		}
		if !MatchesAgentQuery(agent, query) {
			continue
		}
		limit := concurrency
		if limit <= 0 && agent.CPUCount > 0 {
			limit = agent.CPUCount
		}
		if limit <= 0 {
			limit = 1
		}
		if s.running[id] >= limit {
			continue
		}
		s.running[id]++
		if s.byExec[executorName] == nil {
			s.byExec[executorName] = make(map[int64]int)
		}
		s.byExec[executorName][id]++
		return id, nil
	}
	return 0, fmt.Errorf("resource: no agent available matching query %q", query)
}

// ReleaseAgent frees a concurrency slot after job completion.
func (s *Service) ReleaseAgent(agentID int64, executorName string) {
	if s == nil || agentID == 0 {
		return
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.running[agentID] > 0 {
		s.running[agentID]--
	}
	if m := s.byExec[executorName]; m != nil && m[agentID] > 0 {
		m[agentID]--
	}
}

// RunningOnAgent returns active jobs on an agent.
func (s *Service) RunningOnAgent(agentID int64) int {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.running[agentID]
}

// MatchesAgentQuery evaluates a simplified OneDev AgentQuery string.
// Supports: empty (any), name "foo", online, paused is false, attribute key=value.
func MatchesAgentQuery(agent *model.Agent, query string) bool {
	query = strings.TrimSpace(query)
	if query == "" || query == "*" {
		return true
	}
	if agent == nil {
		return false
	}
	lower := strings.ToLower(query)
	if strings.HasPrefix(lower, "attribute ") {
		return matchAttribute(agent, strings.TrimPrefix(query, "attribute "))
	}
	if strings.HasPrefix(lower, "name ") {
		want := strings.Trim(strings.TrimPrefix(query, "name "), `"`)
		return strings.EqualFold(agent.Name, want)
	}
	parts := splitQueryParts(query)
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		lower := strings.ToLower(part)
		switch {
		case lower == "online":
			if !agent.Online {
				return false
			}
		case lower == "paused is false" || lower == "not paused":
			if agent.Paused {
				return false
			}
		case strings.HasPrefix(lower, "name "):
			want := strings.Trim(strings.TrimPrefix(part, "name "), `"`)
			if !strings.EqualFold(agent.Name, want) {
				return false
			}
		case strings.HasPrefix(lower, "attribute "):
			kv := strings.TrimPrefix(part, "attribute ")
			kv = strings.TrimPrefix(kv, "Attribute ")
			if !matchAttribute(agent, kv) {
				return false
			}
		default:
			// Free-text name match fallback.
			if !strings.Contains(strings.ToLower(agent.Name), lower) {
				return false
			}
		}
	}
	return true
}

func matchAttribute(agent *model.Agent, expr string) bool {
	k, v, ok := strings.Cut(expr, "=")
	if !ok {
		return false
	}
	k = strings.TrimSpace(strings.Trim(k, `"`))
	v = strings.TrimSpace(strings.Trim(v, `"`))
	if agent.Attributes == nil {
		return false
	}
	return agent.Attributes[k] == v
}

func splitQueryParts(query string) []string {
	var parts []string
	var cur strings.Builder
	inQuote := false
	for _, r := range query {
		switch r {
		case '"':
			inQuote = !inQuote
			cur.WriteRune(r)
		case ' ', '\t':
			if inQuote {
				cur.WriteRune(r)
			} else if cur.Len() > 0 {
				parts = append(parts, cur.String())
				cur.Reset()
			}
		default:
			cur.WriteRune(r)
		}
	}
	if cur.Len() > 0 {
		parts = append(parts, cur.String())
	}
	if len(parts) == 0 {
		return []string{query}
	}
	return parts
}
