package runtime

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/protocol"
)

var defaultUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for agent connections
	},
}

// AgentWebSocket handles agent WebSocket connections for real-time
// communication between the BuildX server and CI agents.
//
// Protocol:
//
// Agent connects:  GET /~api/agents/ws?token=<agent-token>
// Server validates token and marks agent online.
//
// Messages (Agent -> Server):
//
//	{"type":"heartbeat","cpuLoad":0.5,"memFree":1024,"diskFree":10240}
//	{"type":"log","message":"Build started","level":"INFO"}
//
// Messages (Server -> Agent):
//
//	{"type":"exec","buildId":123,"jobToken":"xxx","commands":["go build"]}
//	{"type":"cancel","buildId":123}
//	{"type":"restart"}
type AgentWebSocket struct {
	service  *Service
	upgrader websocket.Upgrader
}

// NewAgentWebSocket creates a new AgentWebSocket handler.
func NewAgentWebSocket(service *Service) *AgentWebSocket {
	return &AgentWebSocket{
		service:  service,
		upgrader: defaultUpgrader,
	}
}

// ServeHTTP handles the WebSocket upgrade and manages the agent connection lifecycle.
func (ws *AgentWebSocket) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Extract agent token from query parameter
	token := r.URL.Query().Get("token")
	if token == "" {
		http.Error(w, "missing token", http.StatusUnauthorized)
		return
	}

	// Validate token and look up agent
	agent, err := ws.service.store.GetByToken(r.Context(), token)
	if err != nil {
		http.Error(w, "invalid token", http.StatusUnauthorized)
		return
	}

	conn, err := ws.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("agent %d: websocket upgrade error: %v", agent.ID, err)
		return
	}
	defer conn.Close()

	// Mark agent online and register session
	if err := ws.service.Connect(r.Context(), agent.ID); err != nil {
		log.Printf("agent %d: connect error: %v", agent.ID, err)
		return
	}
	defer func() {
		_ = ws.service.Disconnect(r.Context(), agent.ID)
	}()

	log.Printf("agent %d (%s): connected", agent.ID, agent.Name)

	wsConn := &wsSession{conn: conn, connectedAt: time.Now().UTC()}
	ws.service.SetSessionConn(agent.ID, wsConn)

	// Read loop
	for {
		_, message, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				log.Printf("agent %d: read error: %v", agent.ID, err)
			}
			break
		}

		var msg agentMessage
		if err := json.Unmarshal(message, &msg); err != nil {
			log.Printf("agent %d: invalid message: %v", agent.ID, err)
			continue
		}

		switch msg.Type {
		case "heartbeat":
			ws.handleHeartbeat(agent.ID, msg)
		case "log":
			ws.handleLog(agent.ID, msg)
		case "jobComplete", "jobFinished":
			ws.handleJobComplete(msg)
		default:
			log.Printf("agent %d: unknown message type: %s", agent.ID, msg.Type)
		}
	}
}

func (ws *AgentWebSocket) handleHeartbeat(agentID int64, msg agentMessage) {
	cpuLoad := msg.CPU
	if cpuLoad == 0 && msg.Data != nil {
		if v, ok := msg.Data["cpuLoad"]; ok {
			cpuLoad, _ = v.(float64)
		}
	}
	var memFree int64
	if msg.Data != nil {
		if v, ok := msg.Data["memFree"]; ok {
			memFree = int64(v.(float64))
		}
	} else {
		memFree = int64(msg.MemFree)
	}
	var diskFree int64
	if msg.Data != nil {
		if v, ok := msg.Data["diskFree"]; ok {
			diskFree = int64(v.(float64))
		}
	} else {
		diskFree = int64(msg.DiskFree)
	}

	_ = ws.service.Heartbeat(context.Background(), agentID, cpuLoad, memFree, diskFree)
}

func (ws *AgentWebSocket) handleLog(agentID int64, msg agentMessage) {
	level := msg.Level
	if level == "" && msg.Data != nil {
		if l, ok := msg.Data["level"]; ok {
			level, _ = l.(string)
		}
	}
	if level == "" {
		level = "INFO"
	}
	message := msg.Message
	if message == "" && msg.Data != nil {
		if m, ok := msg.Data["message"]; ok {
			message, _ = m.(string)
		}
	}
	ws.service.logStore.Append(agentID, level, message)
}

func (ws *AgentWebSocket) handleJobComplete(msg agentMessage) {
	result := protocol.JobResultFromMessage(msg.JobToken, msg.Success, msg.Error, msg.Steps)
	protocol.CompletePending(result)
}

// SendExec sends an execution command to an agent via its WebSocket session.
func (ws *AgentWebSocket) SendExec(agentID, buildID int64, jobToken string, commands []string) error {
	return ws.service.SendMessage(agentID, map[string]any{
		"type":      "exec",
		"buildId":   buildID,
		"jobToken":  jobToken,
		"commands":  commands,
	})
}

// SendCancel sends a cancel command to an agent.
func (ws *AgentWebSocket) SendCancel(agentID, buildID int64) error {
	return ws.service.SendMessage(agentID, map[string]any{
		"type":    "cancel",
		"buildId": buildID,
	})
}

// SendRestart sends a restart command to an agent.
func (ws *AgentWebSocket) SendRestart(agentID int64) error {
	return ws.service.SendMessage(agentID, map[string]any{
		"type": "restart",
	})
}

// agentMessage represents a JSON message exchanged with an agent.
type agentMessage struct {
	Type     string          `json:"type"`
	Data     map[string]any  `json:"data,omitempty"`
	JobToken string          `json:"jobToken,omitempty"`
	Success  bool            `json:"success,omitempty"`
	Steps    json.RawMessage `json:"steps,omitempty"`
	Error    string          `json:"error,omitempty"`
	CPU      float64         `json:"cpuLoad,omitempty"`
	MemFree  float64         `json:"memFree,omitempty"`
	DiskFree float64         `json:"diskFree,omitempty"`
	Level    string          `json:"level,omitempty"`
	Message  string          `json:"message,omitempty"`
}

// wsSession wraps a WebSocket connection for an agent session.
type wsSession struct {
	conn           *websocket.Conn
	connectedAt    time.Time
	lastHeartbeat  time.Time
}

// String returns a human-readable identifier for the session.
func (s *wsSession) String() string {
	return s.conn.RemoteAddr().String()
}

// SendJSON marshals and writes a JSON message to the WebSocket connection.
func (s *wsSession) SendJSON(v any) error {
	s.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
	return s.conn.WriteJSON(v)
}

// SendExecJSON is a helper that constructs the exec message format.
func sendSessionExec(conn *websocket.Conn, buildID int64, jobToken string, commands []string) error {
	msg := map[string]any{
		"type":     "exec",
		"buildId":  buildID,
		"jobToken": jobToken,
		"commands": commands,
	}
	return conn.WriteJSON(msg)
}

// ParseAgentIDFromPath extracts an agent ID from a URL path segment.
// Expected format: /~api/agents/{agentID}/ws
func ParseAgentIDFromPath(path string) (int64, error) {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	for i, p := range parts {
		if p == "agents" && i+1 < len(parts) {
			return strconv.ParseInt(parts[i+1], 10, 64)
		}
	}
	return 0, strconv.ErrSyntax
}
