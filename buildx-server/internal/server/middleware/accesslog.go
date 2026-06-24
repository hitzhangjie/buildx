// Package middleware provides HTTP middleware for the BuildX server.
package middleware

import (
	"log/slog"
	"net/http"
	"strings"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/hitzhangjie/buildx/buildx-server/internal/logging"
)

// staticExtensions lists file extensions that are demoted to trace-level logging.
// These are static assets served by the web UI — not API calls.
var staticExtensions = []string{
	".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp",
	".css", ".js", ".mjs",
	".woff", ".woff2", ".ttf", ".eot", ".otf",
	".map", ".json", ".xml", ".txt",
}

// isStaticRequest returns true when the path ends with a static asset extension.
func isStaticRequest(path string) bool {
	for _, ext := range staticExtensions {
		if strings.HasSuffix(path, ext) {
			return true
		}
	}
	return false
}

// AccessLog logs one structured line per HTTP request (method, path, status, duration).
// Static asset requests (images, fonts, CSS, JS) are logged at trace level.
func AccessLog(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		ww := chimw.NewWrapResponseWriter(w, r.ProtoMajor)
		next.ServeHTTP(ww, r)

		status := ww.Status()
		if status == 0 {
			status = http.StatusOK
		}

		level := slog.LevelInfo
		if isStaticRequest(r.URL.Path) {
			level = logging.LevelTrace
		}
		// Errors/warnings still surface even for static files.
		switch {
		case status >= 500:
			level = slog.LevelError
		case status >= 400:
			level = slog.LevelWarn
		}

		attrs := []any{
			"request_id", chimw.GetReqID(r.Context()),
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"bytes", ww.BytesWritten(),
			"duration_ms", time.Since(start).Milliseconds(),
		}
		if r.URL.RawQuery != "" {
			attrs = append(attrs, "query", r.URL.RawQuery)
		}
		if ip := r.RemoteAddr; ip != "" {
			attrs = append(attrs, "remote", ip)
		}

		slog.Log(r.Context(), level, "http request", attrs...)
	})
}
