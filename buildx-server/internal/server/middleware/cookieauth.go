// Package middleware provides HTTP middleware for the BuildX server.
package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/security"
)

const sessionCookieName = "buildx-session"

// CookieAuth is a middleware that extracts the authenticated user from a session
// cookie and stores it in the request context. If no cookie is present, it falls
// back to Basic Auth and Bearer token authentication.
//
// This middleware does NOT reject unauthenticated requests — it only populates
// the context. Individual handlers decide whether authentication is required.
func CookieAuth(sec security.Service) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Try session cookie first.
			if cookie, err := r.Cookie(sessionCookieName); err == nil && cookie != nil {
				if u, err := sec.ValidateSession(r.Context(), cookie.Value); err == nil && u != nil {
					r = r.WithContext(security.WithUser(r.Context(), u))
					next.ServeHTTP(w, r)
					return
				}
			}

			// 2. Fall back to Basic Auth.
			if user, pass, ok := r.BasicAuth(); ok {
				if u, err := sec.Authenticate(r.Context(), user, pass); err == nil && u != nil {
					r = r.WithContext(security.WithUser(r.Context(), u))
					next.ServeHTTP(w, r)
					return
				}
			}

			// 3. Fall back to Bearer token.
			auth := r.Header.Get("Authorization")
			if strings.HasPrefix(strings.ToLower(auth), "bearer ") {
				token := strings.TrimSpace(auth[7:])
				if u, err := sec.AuthenticateToken(r.Context(), token); err == nil && u != nil {
					r = r.WithContext(security.WithUser(r.Context(), u))
					next.ServeHTTP(w, r)
					return
				}
			}

			// 4. No valid auth — continue as anonymous.
			next.ServeHTTP(w, r)
		})
	}
}

// RequireAuth is middleware that returns 401 if no authenticated user is in the context.
func RequireAuth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if security.UserFromContext(r.Context()) == nil {
			slog.Warn("unauthorized access attempt",
				"method", r.Method,
				"path", r.URL.Path,
				"remote", r.RemoteAddr,
			)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}
