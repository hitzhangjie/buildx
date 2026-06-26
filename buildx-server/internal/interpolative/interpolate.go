package interpolative

import (
	"strconv"
	"strings"
)

// Vars supplies values for @name, @param:x, and @property:x placeholders.
type Vars struct {
	Build   map[string]string // job_name, project_path, branch, ...
	Params  map[string]string
	Props   map[string]string
}

// Interpolate replaces @variables in s. Literal @ is written as @@.
// Unknown variables are left unchanged (OneDev throws at runtime; editor allows drafts).
func Interpolate(s string, vars Vars) string {
	if s == "" || !strings.Contains(s, "@") {
		return s
	}
	var b strings.Builder
	b.Grow(len(s))
	i := 0
	for i < len(s) {
		if s[i] != '@' {
			b.WriteByte(s[i])
			i++
			continue
		}
		if i+1 < len(s) && s[i+1] == '@' {
			b.WriteByte('@')
			i += 2
			continue
		}
		j := i + 1
		for j < len(s) && s[j] != '@' {
			j++
		}
		if j < len(s) && s[j] == '@' {
			name := s[i+1 : j]
			if v, ok := resolve(name, vars); ok {
				b.WriteString(v)
			} else {
				b.WriteByte('@')
				b.WriteString(name)
				b.WriteByte('@')
			}
			i = j + 1
			continue
		}
		// Unclosed @ — keep remainder as-is.
		b.WriteString(s[i:])
		break
	}
	return b.String()
}

func resolve(name string, vars Vars) (string, bool) {
	lower := strings.ToLower(name)
	if v, ok := vars.Build[lower]; ok {
		return v, true
	}
	if strings.HasPrefix(lower, "param:") || strings.HasPrefix(lower, "params:") {
		key := name[strings.Index(name, ":")+1:]
		if v, ok := vars.Params[key]; ok {
			return v, true
		}
		return "", false
	}
	if strings.HasPrefix(lower, "property:") || strings.HasPrefix(lower, "properties:") {
		key := name[strings.Index(name, ":")+1:]
		if v, ok := vars.Props[key]; ok {
			return v, true
		}
		return "", false
	}
	return "", false
}

// BuildVarsFromJobContext assembles interpolation variables from build metadata.
func BuildVarsFromJobContext(projectPath, jobName, refName, commitHash string, buildNumber int64, jobToken string, params, props map[string]string) Vars {
	branch := refName
	tag := ""
	for _, prefix := range []string{"refs/heads/", "refs/tags/"} {
		if strings.HasPrefix(refName, prefix) {
			if strings.HasPrefix(prefix, "refs/heads/") {
				branch = refName[len(prefix):]
			} else {
				tag = refName[len(prefix):]
				branch = ""
			}
			break
		}
	}
	build := map[string]string{
		"project_path": projectPath,
		"job_name":     jobName,
		"ref":          refName,
		"branch":       branch,
		"tag":          tag,
		"commit_hash":  commitHash,
		"build_number": strconv.FormatInt(buildNumber, 10),
		"job_token":    jobToken,
	}
	return Vars{Build: build, Params: cloneMap(params), Props: cloneMap(props)}
}

func cloneMap(m map[string]string) map[string]string {
	if len(m) == 0 {
		return nil
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
