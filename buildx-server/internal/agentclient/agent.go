package agentclient

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	"github.com/hitzhangjie/buildx/buildx-server/internal/agent/jobdata"
	"github.com/hitzhangjie/buildx/buildx-server/internal/executor"
)

// Config holds build agent connection settings.
type Config struct {
	ServerURL string
	Token     string
	Name      string
	WorkBase  string
}

// Agent connects to BuildX server and executes dispatched job plans.
type Agent struct {
	cfg    Config
	conn   *websocket.Conn
	mu     sync.Mutex
	cancel context.CancelFunc
}

// New creates an agent with the given configuration.
func New(cfg Config) *Agent {
	if cfg.WorkBase == "" {
		cfg.WorkBase = filepath.Join(os.TempDir(), "buildx-agent")
	}
	return &Agent{cfg: cfg}
}

// Run connects and processes messages until context cancellation.
func (a *Agent) Run(ctx context.Context) error {
	wsURL := websocketURL(a.cfg.ServerURL) + "?token=" + a.cfg.Token
	dialer := websocket.Dialer{HandshakeTimeout: 15 * time.Second}
	conn, _, err := dialer.DialContext(ctx, wsURL, nil)
	if err != nil {
		return fmt.Errorf("websocket dial: %w", err)
	}
	a.conn = conn
	defer conn.Close()

	go a.heartbeatLoop(ctx)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}
		_, msg, err := conn.ReadMessage()
		if err != nil {
			return err
		}
		if err := a.handleMessage(ctx, msg); err != nil {
			_ = a.sendJSON(map[string]any{"type": "log", "level": "ERROR", "message": err.Error()})
		}
	}
}

func (a *Agent) heartbeatLoop(ctx context.Context) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			_ = a.sendJSON(map[string]any{
				"type":     "heartbeat",
				"cpuLoad":  0.1,
				"memFree":  int64(1 << 30),
				"diskFree": int64(10 << 30),
			})
		}
	}
}

type inboundMessage struct {
	Type     string                `json:"type"`
	JobData  *jobdata.ShellJobData `json:"jobData"`
	BuildID  int64                 `json:"buildId"`
	JobToken string                `json:"jobToken"`
}

func (a *Agent) handleMessage(ctx context.Context, raw []byte) error {
	var msg inboundMessage
	if err := json.Unmarshal(raw, &msg); err != nil {
		return err
	}
	switch msg.Type {
	case "executePlan":
		if msg.JobData == nil {
			return fmt.Errorf("executePlan: missing jobData")
		}
		go a.runJob(ctx, *msg.JobData)
	case "cancel":
		a.mu.Lock()
		if a.cancel != nil {
			a.cancel()
		}
		a.mu.Unlock()
	case "restart":
		return fmt.Errorf("restart requested")
	}
	return nil
}

func (a *Agent) runJob(parent context.Context, data jobdata.ShellJobData) {
	ctx, cancel := context.WithCancel(parent)
	a.mu.Lock()
	a.cancel = cancel
	a.mu.Unlock()
	defer cancel()

	worker := NewWorkerClient(a.cfg.ServerURL, data.JobToken)
	jobCtx := &executor.JobContext{
		BuildID:     data.BuildID,
		BuildNumber: data.BuildNumber,
		ProjectID:   data.ProjectID,
		ProjectPath: data.ProjectPath,
		ProjectName: data.ProjectName,
		JobID:       data.JobID,
		JobName:     data.JobName,
		JobToken:    data.JobToken,
		CommitHash:  data.CommitHash,
		RefName:     data.RefName,
		Timeout:     data.TimeoutSec,
		Cache:       &WorkerCacheHandler{Worker: worker},
		ServerSteps: &WorkerServerSteps{Worker: worker},
	}
	workDir := executor.BuildWorkDir(a.cfg.WorkBase, jobCtx)
	jobCtx.WorkDir = workDir
	_ = os.MkdirAll(workDir, 0755)
	_, _ = worker.FetchJobData(ctx, workDir)
	_ = worker.DownloadDependencies(ctx, workDir)

	logger := &wsLogger{agent: a, jobToken: data.JobToken}
	logger.Log("info", fmt.Sprintf("executing build #%d on agent", data.BuildNumber))

	runner := executor.NewServerShellExecutor(a.cfg.WorkBase)
	results, err := executor.ExecutePlanOnShell(ctx, jobCtx, data.Plan, runner, logger)

	success := err == nil
	var errMsg string
	steps := make([]jobdata.JobStepResult, 0, len(results))
	for _, r := range results {
		steps = append(steps, jobdata.JobStepResult{
			Name: r.Name, Success: r.Success, ExitCode: r.ExitCode,
			DurationMs: r.DurationMs, Error: r.Error,
		})
		if !r.Success {
			success = false
			if errMsg == "" {
				errMsg = r.Error
			}
		}
	}
	if err != nil {
		success = false
		errMsg = err.Error()
	}

	_ = a.sendJSON(map[string]any{
		"type":     "jobComplete",
		"jobToken": data.JobToken,
		"success":  success,
		"error":    errMsg,
		"steps":    steps,
	})
}

func (a *Agent) sendJSON(v any) error {
	a.mu.Lock()
	defer a.mu.Unlock()
	if a.conn == nil {
		return fmt.Errorf("not connected")
	}
	return a.conn.WriteJSON(v)
}

type wsLogger struct {
	agent    *Agent
	jobToken string
}

func (l *wsLogger) Log(level, message string) {
	_ = l.agent.sendJSON(map[string]any{
		"type": "log", "level": level, "message": message, "jobToken": l.jobToken,
	})
}
func (l *wsLogger) Logf(level, format string, args ...interface{}) {
	l.Log(level, fmt.Sprintf(format, args...))
}
func (l *wsLogger) Stdout(message string) { l.Log("stdout", message) }
func (l *wsLogger) Stderr(message string) { l.Log("stderr", message) }

func websocketURL(server string) string {
	return WebsocketURLForTest(server)
}

// WebsocketURLForTest builds the agent WebSocket URL (exported for tests).
func WebsocketURLForTest(server string) string {
	server = strings.TrimRight(server, "/")
	if strings.HasPrefix(server, "https://") {
		return "wss://" + strings.TrimPrefix(server, "https://") + "/~api/agents/ws"
	}
	if strings.HasPrefix(server, "http://") {
		return "ws://" + strings.TrimPrefix(server, "http://") + "/~api/agents/ws"
	}
	return "ws://" + server + "/~api/agents/ws"
}
