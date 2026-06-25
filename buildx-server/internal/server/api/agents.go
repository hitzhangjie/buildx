package api

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// AgentsHandler handles agent management endpoints.
// Maps to OneDev's AgentResource.java.
// All endpoints require admin privileges (user.ID == model.UserRootID).
type AgentsHandler struct {
	Agents   AgentStore
	Security securityService
}

// AgentStore defines the interface for agent persistence operations.
type AgentStore interface {
	Get(ctx context.Context, id int64) (*model.Agent, error)
	GetByName(ctx context.Context, name string) (*model.Agent, error)
	Query(ctx context.Context, filter AgentQueryFilter, offset, count int) ([]*model.Agent, error)
	Update(ctx context.Context, agent *model.Agent) error
	Delete(ctx context.Context, id int64) error
	CreateToken(ctx context.Context, agentID int64) (*model.AgentToken, error)
	GetToken(ctx context.Context, agentID int64) (*model.AgentToken, error)
	SetAttributes(ctx context.Context, agentID int64, attrs map[string]string) error
	GetAttributes(ctx context.Context, agentID int64) (map[string]string, error)
}

// AgentQueryFilter defines search criteria for agent queries.
type AgentQueryFilter struct {
	Name     string
	Status   string
	OS       string
	OSArch   string
	FreeText string
}

// Query handles GET /~api/agents — Query agents (admin only).
func (h *AgentsHandler) Query(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "AgentsHandler.Query")
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	filter := AgentQueryFilter{
		Name:     r.URL.Query().Get("name"),
		Status:   r.URL.Query().Get("status"),
		OS:       r.URL.Query().Get("os"),
		OSArch:   r.URL.Query().Get("osArch"),
		FreeText: r.URL.Query().Get("query"),
	}

	offset, count := parsePagination(r)

	agents, err := h.Agents.Query(r.Context(), filter, offset, count)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK, "count", len(agents))
	writeJSON(w, r, http.StatusOK, agents)
}

// Get handles GET /~api/agents/{agentId} — Get agent details (admin only).
func (h *AgentsHandler) Get(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.Get", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	agent, err := h.Agents.Get(r.Context(), agentID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if agent == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "agent", "agent_id", agentID)
		return
	}

	op.OK(http.StatusOK, "agent_name", agent.Name)
	writeJSON(w, r, http.StatusOK, agent)
}

// GetAttributes handles GET /~api/agents/{agentId}/attributes — Get agent attributes (admin only).
func (h *AgentsHandler) GetAttributes(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.GetAttributes", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	attrs, err := h.Agents.GetAttributes(r.Context(), agentID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, attrs)
}

// UpdateAttributes handles POST /~api/agents/{agentId}/attributes — Update agent attributes (admin only).
func (h *AgentsHandler) UpdateAttributes(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.UpdateAttributes", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	var attrs map[string]string
	if err := decodeJSON(r, &attrs); err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid json", err)
		return
	}

	if err := h.Agents.SetAttributes(r.Context(), agentID, attrs); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, attrs)
}

// GetToken handles GET /~api/agents/{agentId}/token — Get agent token (admin only).
func (h *AgentsHandler) GetToken(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.GetToken", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	token, err := h.Agents.GetToken(r.Context(), agentID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if token == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "agent_token", "agent_id", agentID)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, token)
}

// RegenerateToken handles POST /~api/agents/{agentId}/token — Regenerate agent token (admin only).
func (h *AgentsHandler) RegenerateToken(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.RegenerateToken", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	token, err := h.Agents.CreateToken(r.Context(), agentID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusOK)
	writeJSON(w, r, http.StatusOK, token)
}

// Delete handles DELETE /~api/agents/{agentId} — Delete agent (admin only).
func (h *AgentsHandler) Delete(w http.ResponseWriter, r *http.Request, agentID int64) {
	op := StartOp(r, "AgentsHandler.Delete", "agent_id", agentID)
	user, err := h.authenticateAdmin(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}
	op.With("user_id", user.ID)

	if h.Agents == nil {
		op.Fail(errors.New("agent store not available"), http.StatusNotImplemented)
		http.Error(w, "agent store not available", http.StatusNotImplemented)
		return
	}

	if err := h.Agents.Delete(r.Context(), agentID); err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	op.OK(http.StatusNoContent)
	w.WriteHeader(http.StatusNoContent)
}

// authenticateAdmin requires the user to be authenticated and be the root admin.
func (h *AgentsHandler) authenticateAdmin(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if err != nil {
		return nil, err
	}
	if user.ID != model.UserRootID {
		return nil, security.ErrUnauthorized
	}
	return user, nil
}

func (h *AgentsHandler) authenticate(r *http.Request) (*model.User, error) {
	if u := security.UserFromContext(r.Context()); u != nil {
		return u, nil
	}
	if user, pass, ok := r.BasicAuth(); ok {
		return h.Security.Authenticate(r.Context(), user, pass)
	}
	auth := r.Header.Get("Authorization")
	if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
		token := strings.TrimSpace(auth[7:])
		return h.Security.AuthenticateToken(r.Context(), token)
	}
	return nil, security.ErrUnauthorized
}

// parsePagination extracts offset and count query parameters with defaults.
func parsePagination(r *http.Request) (offset, count int) {
	// Default: first 50 results.
	count = 50
	if s := r.URL.Query().Get("count"); s != "" {
		if v, err := parseInt64(s); err == nil && v > 0 && v <= 100 {
			count = int(v)
		}
	}
	if s := r.URL.Query().Get("offset"); s != "" {
		if v, err := parseInt64(s); err == nil && v >= 0 {
			offset = int(v)
		}
	}
	return
}

// parseInt64 parses a string as int64, used for query parameter parsing.
func parseInt64(s string) (int64, error) {
	var v int64
	for _, c := range []byte(s) {
		if c < '0' || c > '9' {
			return 0, errors.New("not a number")
		}
		v = v*10 + int64(c-'0')
	}
	return v, nil
}
