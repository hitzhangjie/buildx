package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/hitzhangjie/buildx/buildx-server/internal/build"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// BuildLogHandler handles build log retrieval and streaming (SSE).
// Maps to OneDev's BuildLogStreamResource.java.
type BuildLogHandler struct {
	Jobs     LogService
	Builds   buildStore
	Security securityService
}

// LogService defines the interface for build log operations.
type LogService interface {
	GetLog(ctx context.Context, buildID int64) ([]LogEntry, error)
	StreamLog(ctx context.Context, buildID int64) (<-chan LogEntry, error)
}

// LogEntry represents a single log entry from a build step.
type LogEntry struct {
	ID        int64     `json:"id"`
	BuildID   int64     `json:"buildId"`
	Timestamp time.Time `json:"timestamp"`
	Level     string    `json:"level"`
	Message   string    `json:"message"`
	StepName  string    `json:"stepName,omitempty"`
}

// GetLog handles GET /~api/builds/{buildId}/log — Returns stored log entries (non-streaming fallback).
func (h *BuildLogHandler) GetLog(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildLogHandler.GetLog", "build_id", buildID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	// Verify the build exists and is accessible.
	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if h.Jobs == nil {
		op.Fail(errors.New("log service not available"), http.StatusNotImplemented)
		http.Error(w, "log service not available", http.StatusNotImplemented)
		return
	}

	entries, err := h.Jobs.GetLog(r.Context(), buildID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if entries == nil {
		entries = []LogEntry{}
	}

	op.OK(http.StatusOK, "count", len(entries))
	writeJSON(w, r, http.StatusOK, entries)
}

// StreamLog handles GET /~api/builds/{buildId}/log-stream — SSE stream of live log entries.
// Sends text/event-stream with each log entry as a JSON event.
// Stays open until build completes or client disconnects.
func (h *BuildLogHandler) StreamLog(w http.ResponseWriter, r *http.Request, buildID int64) {
	op := StartOp(r, "BuildLogHandler.StreamLog", "build_id", buildID)
	user, err := h.authenticateOptional(r)
	if err != nil {
		op.Fail(err, http.StatusUnauthorized)
		writeError(w, r, err)
		return
	}

	// Verify the build exists and is accessible.
	b, err := h.Builds.Get(r.Context(), buildID)
	if err != nil {
		if errors.Is(err, build.ErrNotFound) {
			op.OK(http.StatusNotFound, "found", false)
			writeNotFound(w, r, "build", "build_id", buildID)
			return
		}
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if !h.canAccessBuild(r, user, b) {
		op.Fail(security.ErrUnauthorized, http.StatusForbidden)
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}

	if h.Jobs == nil {
		op.Fail(errors.New("log service not available"), http.StatusNotImplemented)
		http.Error(w, "log service not available", http.StatusNotImplemented)
		return
	}

	logCh, err := h.Jobs.StreamLog(r.Context(), buildID)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}

	// Set SSE headers.
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		op.Fail(errors.New("streaming not supported"), http.StatusInternalServerError)
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	op.OK(http.StatusOK)
	flusher.Flush()

	for {
		select {
		case entry, ok := <-logCh:
			if !ok {
				// Log channel closed — stream complete.
				return
			}
			data, err := json.Marshal(entry)
			if err != nil {
				slog.WarnContext(r.Context(), "failed to marshal log entry",
					"build_id", buildID,
					"error", err,
				)
				continue
			}
			_, err = fmt.Fprintf(w, "data: %s\n\n", data)
			if err != nil {
				// Client disconnected.
				return
			}
			flusher.Flush()
		case <-r.Context().Done():
			// Client disconnected.
			return
		}
	}
}

func (h *BuildLogHandler) canAccessBuild(r *http.Request, user *model.User, b *model.Build) bool {
	_ = r
	_ = user
	_ = b
	return true
}

func (h *BuildLogHandler) authenticateOptional(r *http.Request) (*model.User, error) {
	user, err := h.authenticate(r)
	if errors.Is(err, security.ErrUnauthorized) {
		return nil, nil
	}
	return user, err
}

func (h *BuildLogHandler) authenticate(r *http.Request) (*model.User, error) {
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
