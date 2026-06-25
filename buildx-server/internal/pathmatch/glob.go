// Package pathmatch provides simple path glob matching for CI artifact and cache patterns.
package pathmatch

import (
	"path"
	"strings"
)

// MatchAny reports whether path matches any space-separated glob pattern.
// Supports * (within component), ** (across components), and ?.
func MatchAny(filePath, patterns string) bool {
	if strings.TrimSpace(patterns) == "" {
		return true
	}
	for _, p := range strings.Fields(patterns) {
		if Match(filePath, p) {
			return true
		}
	}
	return false
}

// Match reports whether filePath matches a single glob pattern.
func Match(filePath, pattern string) bool {
	if pattern == "" || pattern == "*" || pattern == "**" {
		return true
	}
	filePath = path.Clean(strings.TrimPrefix(filePath, "./"))
	pattern = strings.TrimPrefix(pattern, "./")

	if strings.Contains(pattern, "**") {
		parts := strings.SplitN(pattern, "**", 2)
		prefix := strings.TrimSuffix(parts[0], "/")
		suffix := strings.TrimPrefix(parts[1], "/")
		if prefix != "" && !strings.HasPrefix(filePath, prefix) {
			return false
		}
		rest := filePath
		if prefix != "" {
			rest = strings.TrimPrefix(rest, prefix)
			rest = strings.TrimPrefix(rest, "/")
		}
		if suffix == "" {
			return true
		}
		return strings.HasSuffix(rest, suffix) || strings.Contains(rest, suffix)
	}

	return matchComponent(filePath, pattern)
}

func matchComponent(name, pattern string) bool {
	if strings.Count(pattern, "*") == 1 && !strings.Contains(pattern, "?") {
		idx := strings.Index(pattern, "*")
		prefix := pattern[:idx]
		suffix := pattern[idx+1:]
		return strings.HasPrefix(name, prefix) && strings.HasSuffix(name, suffix) &&
			len(name) >= len(prefix)+len(suffix)
	}
	// Fallback: exact match or simple prefix*
	if strings.HasSuffix(pattern, "*") {
		return strings.HasPrefix(name, strings.TrimSuffix(pattern, "*"))
	}
	return name == pattern
}
