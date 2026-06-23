package api

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

// OpLog traces a single API handler invocation: inputs, steps, outcome, and errors.
type OpLog struct {
	ctx   context.Context
	op    string
	start time.Time
	attrs []any
}

// StartOp begins structured logging for handler op. Call OK, Fail, or Done when finished.
func StartOp(r *http.Request, op string, attrs ...any) *OpLog {
	a := append([]any{"request_id", requestID(r), "method", r.Method, "path", r.URL.Path}, attrs...)
	slog.InfoContext(r.Context(), "api request", append([]any{"op", op}, a...)...)
	return &OpLog{ctx: r.Context(), op: op, start: time.Now(), attrs: a}
}

func (o *OpLog) With(attrs ...any) *OpLog {
	o.attrs = append(o.attrs, attrs...)
	return o
}

// OK logs successful completion at Info level.
func (o *OpLog) OK(status int, attrs ...any) {
	all := append(o.attrs, attrs...)
	all = append(all, "status", status, "duration_ms", elapsedMs(o.start))
	slog.InfoContext(o.ctx, "api response", append([]any{"op", o.op}, all...)...)
}

// Fail logs a handler-level failure. Client errors use Warn; server errors use Error.
func (o *OpLog) Fail(err error, status int, attrs ...any) {
	all := append(o.attrs, attrs...)
	all = append(all, "status", status, "duration_ms", elapsedMs(o.start))
	if err != nil {
		all = append(all, "error", err)
	}

	level := slog.LevelWarn
	if status >= 500 {
		level = slog.LevelError
	}
	slog.Log(o.ctx, level, "api failed", append([]any{"op", o.op}, all...)...)
}

func decodeJSON(r *http.Request, v any) error {
	if err := json.NewDecoder(r.Body).Decode(v); err != nil {
		slog.WarnContext(r.Context(), "invalid request body",
			"request_id", requestID(r),
			"path", r.URL.Path,
			"error", err,
		)
		return err
	}
	return nil
}

func requestID(r *http.Request) string {
	return chimw.GetReqID(r.Context())
}

func elapsedMs(start time.Time) int64 {
	return time.Since(start).Milliseconds()
}

func writeJSON(w http.ResponseWriter, r *http.Request, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(v); err != nil {
		slog.ErrorContext(r.Context(), "encode json response failed",
			"request_id", requestID(r),
			"path", r.URL.Path,
			"status", status,
			"error", err,
		)
	}
}

func writeError(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, security.ErrInvalidCredentials):
		slog.WarnContext(r.Context(), "authentication failed",
			"request_id", requestID(r),
			"path", r.URL.Path,
			"reason", "invalid_credentials",
		)
		writeJSONError(w, http.StatusUnauthorized, "Invalid credentials")
	case errors.Is(err, security.ErrUnauthorized):
		slog.WarnContext(r.Context(), "authentication required",
			"request_id", requestID(r),
			"path", r.URL.Path,
		)
		writeJSONError(w, http.StatusUnauthorized, "Not authenticated")
	case errors.Is(err, security.ErrUserDisabled):
		slog.WarnContext(r.Context(), "user disabled",
			"request_id", requestID(r),
			"path", r.URL.Path,
		)
		writeJSONError(w, http.StatusForbidden, "user disabled")
	default:
		writeInternalError(w, r, err)
	}
}

func writeJSONError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}

func writeInternalError(w http.ResponseWriter, r *http.Request, err error) {
	slog.ErrorContext(r.Context(), "internal server error",
		"request_id", requestID(r),
		"path", r.URL.Path,
		"error", err,
	)
	http.Error(w, err.Error(), http.StatusInternalServerError)
}

func writeNotFound(w http.ResponseWriter, r *http.Request, resource string, attrs ...any) {
	a := append([]any{
		"request_id", requestID(r),
		"path", r.URL.Path,
		"resource", resource,
	}, attrs...)
	slog.InfoContext(r.Context(), "resource not found", a...)
	http.NotFound(w, r)
}

func writeBadRequest(w http.ResponseWriter, r *http.Request, message string, err error) {
	attrs := []any{
		"request_id", requestID(r),
		"path", r.URL.Path,
		"message", message,
	}
	if err != nil {
		attrs = append(attrs, "error", err)
	}
	slog.WarnContext(r.Context(), "bad request", attrs...)
	http.Error(w, message, http.StatusBadRequest)
}
