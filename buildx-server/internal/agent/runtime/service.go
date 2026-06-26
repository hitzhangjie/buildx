package runtime

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// AgentSession tracks a live agent connection.
type AgentSession struct {
	AgentID       int64     `json:"agentId"`
	ConnectedAt   time.Time `json:"connectedAt"`
	LastHeartbeat time.Time `json:"lastHeartbeat"`
	conn          any       // underlying transport (e.g., *websocket.Conn)
}

// BuildLogForwarder receives build log lines from connected agents.
type BuildLogForwarder func(jobToken, level, message string)

// Service manages agent lifecycle: registration, connection, heartbeats,
// and command dispatch.
type Service struct {
	store    *DBStore
	logStore *LogStore

	buildLogs BuildLogForwarder

	mu       sync.RWMutex
	sessions map[int64]*AgentSession // agentID -> session
}

// NewService creates a new agent runtime Service.
func NewService(store *DBStore) *Service {
	return &Service{
		store:    store,
		logStore: NewLogStore(),
		sessions: make(map[int64]*AgentSession),
	}
}

// SetBuildLogForwarder registers a callback for agent build log lines.
func (s *Service) SetBuildLogForwarder(f BuildLogForwarder) {
	s.buildLogs = f
}

// ForwardBuildLog delivers a log line to the registered build log forwarder.
func (s *Service) ForwardBuildLog(jobToken, level, message string) {
	if s != nil && s.buildLogs != nil && jobToken != "" {
		s.buildLogs(jobToken, level, message)
	}
}

// Register creates a new agent and a corresponding authentication token.
// If an agent with the same name already exists, it is returned instead
// (idempotent registration).
func (s *Service) Register(ctx context.Context, data *model.AgentData) (*model.Agent, *model.AgentToken, error) {
	if data == nil {
		return nil, nil, errors.New("agent data is required")
	}
	if data.Name == "" {
		return nil, nil, errors.New("agent name is required")
	}

	// Check if agent with this name already exists
	existing, err := s.store.GetByName(ctx, data.Name)
	if err != nil && !errors.Is(err, ErrNotFound) {
		return nil, nil, fmt.Errorf("lookup existing agent: %w", err)
	}

	if existing != nil {
		// Update agent data
		existing.OS = data.OSName
		existing.Arch = data.OSArch
		existing.OSVersion = data.OSVersion
		existing.CPUCount = data.CPUCount
		existing.MemTotal = data.MemTotal
		existing.DiskTotal = data.DiskTotal
		existing.AgentVersion = data.Version
		if data.Attributes != nil {
			existing.Attributes = data.Attributes
		}

		if err := s.store.Update(ctx, existing); err != nil {
			return nil, nil, fmt.Errorf("update existing agent: %w", err)
		}
		if data.Attributes != nil {
			if err := s.store.SetAttributes(ctx, existing.ID, data.Attributes); err != nil {
				return nil, nil, fmt.Errorf("set attributes: %w", err)
			}
		}

		// Get or create token
		token, err := s.store.GetToken(ctx, existing.ID)
		if err != nil {
			if !errors.Is(err, ErrNotFound) {
				return nil, nil, fmt.Errorf("get token: %w", err)
			}
			// Create a new token
			token, err = s.store.CreateToken(ctx, existing.ID)
			if err != nil {
				return nil, nil, fmt.Errorf("create token: %w", err)
			}
		}

		return existing, token, nil
	}

	// Create new agent
	agent := &model.Agent{
		Name:    data.Name,
		OS:      data.OSName,
		Arch:    data.OSArch,
		OSVersion: data.OSVersion,
		CPUCount: data.CPUCount,
		MemTotal: data.MemTotal,
		DiskTotal: data.DiskTotal,
		AgentVersion: data.Version,
	}

	agent, err = s.store.Create(ctx, agent)
	if err != nil {
		return nil, nil, fmt.Errorf("create agent: %w", err)
	}

	if data.Attributes != nil {
		if err := s.store.SetAttributes(ctx, agent.ID, data.Attributes); err != nil {
			return nil, nil, fmt.Errorf("set attributes: %w", err)
		}
		agent.Attributes = data.Attributes
	}

	// Create auth token
	token, err := s.store.CreateToken(ctx, agent.ID)
	if err != nil {
		return nil, nil, fmt.Errorf("create token: %w", err)
	}

	return agent, token, nil
}

// Connect marks an agent as online and starts heartbeat tracking.
func (s *Service) Connect(ctx context.Context, agentID int64) error {
	agent, err := s.store.Get(ctx, agentID)
	if err != nil {
		return fmt.Errorf("get agent: %w", err)
	}

	agent.Online = true
	now := time.Now().UTC()
	agent.LastActiveDate = &now

	if err := s.store.Update(ctx, agent); err != nil {
		return fmt.Errorf("update agent status: %w", err)
	}

	s.mu.Lock()
	s.sessions[agentID] = &AgentSession{
		AgentID:       agentID,
		ConnectedAt:   now,
		LastHeartbeat: now,
	}
	s.mu.Unlock()

	return nil
}

// Disconnect marks an agent as offline and cleans up its session.
func (s *Service) Disconnect(ctx context.Context, agentID int64) error {
	agent, err := s.store.Get(ctx, agentID)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			// Agent may have been deleted; just clean up session.
			s.mu.Lock()
			delete(s.sessions, agentID)
			s.mu.Unlock()
			return nil
		}
		return fmt.Errorf("get agent: %w", err)
	}

	agent.Online = false

	if err := s.store.Update(ctx, agent); err != nil {
		return fmt.Errorf("update agent status: %w", err)
	}

	s.mu.Lock()
	delete(s.sessions, agentID)
	s.mu.Unlock()

	return nil
}

// Heartbeat updates agent resource metrics and refreshes the last heartbeat time.
func (s *Service) Heartbeat(ctx context.Context, agentID int64, cpuLoad float64, memFree, diskFree int64) error {
	s.mu.Lock()
	session, ok := s.sessions[agentID]
	if ok {
		session.LastHeartbeat = time.Now().UTC()
	}
	s.mu.Unlock()

	if !ok {
		return fmt.Errorf("agent %d: not connected", agentID)
	}

	return s.store.UpdateStatus(ctx, agentID, true, &model.AgentData{
		CpuLoad: cpuLoad,
		MemFree: memFree,
		DiskFree: diskFree,
	})
}

// GetOnlineAgents returns the IDs of all currently connected agents.
func (s *Service) GetOnlineAgents(ctx context.Context) []int64 {
	s.mu.RLock()
	defer s.mu.RUnlock()

	ids := make([]int64, 0, len(s.sessions))
	for id := range s.sessions {
		ids = append(ids, id)
	}
	return ids
}

// FindByName looks up an agent by name.
func (s *Service) FindByName(ctx context.Context, name string) (*model.Agent, error) {
	return s.store.GetByName(ctx, name)
}

// Pause marks an agent as paused, preventing new builds from being assigned.
func (s *Service) Pause(ctx context.Context, agentID int64) error {
	agent, err := s.store.Get(ctx, agentID)
	if err != nil {
		return err
	}
	agent.Paused = true
	return s.store.Update(ctx, agent)
}

// Resume un-pauses an agent, allowing new builds to be assigned again.
func (s *Service) Resume(ctx context.Context, agentID int64) error {
	agent, err := s.store.Get(ctx, agentID)
	if err != nil {
		return err
	}
	agent.Paused = false
	return s.store.Update(ctx, agent)
}

// Restart disconnects an agent and expects it to reconnect.
// The agent's online status is cleared until reconnection.
func (s *Service) Restart(ctx context.Context, agentID int64) error {
	// Disconnect the agent
	if err := s.Disconnect(ctx, agentID); err != nil {
		return fmt.Errorf("disconnect: %w", err)
	}

	// Send restart command if there is an active session
	s.mu.RLock()
	session := s.sessions[agentID]
	s.mu.RUnlock()

	if session != nil {
		// Try to send restart via the session's connection
		if conn, ok := session.conn.(interface{ SendJSON(v any) error }); ok {
			if err := conn.SendJSON(map[string]string{"type": "restart"}); err != nil {
				log.Printf("agent %d: send restart command: %v", agentID, err)
			}
		}
	}

	return nil
}

// GetAgentLog returns recent log entries for the given agent.
func (s *Service) GetAgentLog(ctx context.Context, agentID int64) ([]LogEntry, error) {
	// Verify agent exists
	_, err := s.store.Get(ctx, agentID)
	if err != nil {
		return nil, err
	}
	return s.logStore.GetLogs(agentID, 0), nil
}

// LogStore returns the underlying LogStore (for direct access if needed).
func (s *Service) LogStore() *LogStore {
	return s.logStore
}

// SendMessage sends an arbitrary JSON-serializable message to an agent's session.
func (s *Service) SendMessage(agentID int64, msg any) error {
	s.mu.RLock()
	session, ok := s.sessions[agentID]
	s.mu.RUnlock()

	if !ok {
		return fmt.Errorf("agent %d: not connected", agentID)
	}

	if session.conn == nil {
		return fmt.Errorf("agent %d: no transport connection", agentID)
	}

	// Use the conn's SendJSON method if available
	if sender, ok := session.conn.(interface{ SendJSON(v any) error }); ok {
		return sender.SendJSON(msg)
	}

	// Fallback: JSON marshal and write (for raw conn types)
	data, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal message: %w", err)
	}

	if writer, ok := session.conn.(interface{ Write(p []byte) (int, error) }); ok {
		_, err := writer.Write(data)
		return err
	}

	return errors.New("agent session transport does not support writing")
}

// SetSessionConn associates a transport connection with an agent session.
// This is used by the WebSocket handler after upgrade.
func (s *Service) SetSessionConn(agentID int64, conn any) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if session, ok := s.sessions[agentID]; ok {
		session.conn = conn
	}
}
