package execplan

import (
	"os"
	"regexp"
	"strings"
)

var (
	propertyRef = regexp.MustCompile(`@property:([A-Za-z0-9_.-]+)@`)
	secretRef   = regexp.MustCompile(`@secret:([A-Za-z0-9_.-]+)@`)
	paramRef    = regexp.MustCompile(`@param:([A-Za-z0-9_.-]+)@`)
)

// InterpolateString replaces @property:, @secret:, and @param: placeholders.
func InterpolateString(s string, params map[string]string, secrets map[string]string) string {
	if s == "" {
		return s
	}
	out := s
	out = propertyRef.ReplaceAllStringFunc(out, func(m string) string {
		name := propertyRef.FindStringSubmatch(m)
		if len(name) < 2 {
			return m
		}
		if params != nil {
			if v, ok := params[name[1]]; ok {
				return v
			}
		}
		if v := os.Getenv("BUILDX_PROPERTY_" + strings.ToUpper(name[1])); v != "" {
			return v
		}
		return m
	})
	out = secretRef.ReplaceAllStringFunc(out, func(m string) string {
		name := secretRef.FindStringSubmatch(m)
		if len(name) < 2 {
			return m
		}
		if secrets != nil {
			if v, ok := secrets[name[1]]; ok {
				return v
			}
		}
		if v := os.Getenv("BUILDX_SECRET_" + strings.ToUpper(name[1])); v != "" {
			return v
		}
		return m
	})
	out = paramRef.ReplaceAllStringFunc(out, func(m string) string {
		name := paramRef.FindStringSubmatch(m)
		if len(name) < 2 || params == nil {
			return m
		}
		if v, ok := params[name[1]]; ok {
			return v
		}
		return m
	})
	return out
}

// LoadSecretsFromEnv reads BUILDX_SECRET_* env vars into a map (stub secret provider).
func LoadSecretsFromEnv() map[string]string {
	out := make(map[string]string)
	for _, kv := range os.Environ() {
		if !strings.HasPrefix(kv, "BUILDX_SECRET_") {
			continue
		}
		parts := strings.SplitN(kv, "=", 2)
		if len(parts) != 2 {
			continue
		}
		key := strings.ToLower(strings.TrimPrefix(parts[0], "BUILDX_SECRET_"))
		out[key] = parts[1]
	}
	return out
}
