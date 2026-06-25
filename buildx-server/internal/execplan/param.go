package execplan

import (
	"maps"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// ResolveParamMaps expands paramMatrix into concrete parameter maps, applying
// excludeParamMaps filtering. Maps to ParamUtils.resolveParams (simplified: no
// secret interpolation or build-scoped value providers).
func ResolveParamMaps(
	matrix []buildspec.ParamInstances,
	exclude []buildspec.ParamMap,
	base map[string]string,
) []map[string]string {
	evaled := make(map[string][][]string)
	for _, p := range matrix {
		if p.Name == "" {
			continue
		}
		if len(p.Values) == 0 {
			evaled[p.Name] = [][]string{{""}}
		} else {
			rows := make([][]string, len(p.Values))
			for i, v := range p.Values {
				rows[i] = []string{v}
			}
			evaled[p.Name] = rows
		}
	}

	raw := cartesianParamMaps(evaled)
	if len(raw) == 0 {
		if len(base) == 0 {
			return []map[string]string{{}}
		}
		return []map[string]string{cloneStringMap(base)}
	}

	out := make([]map[string]string, 0, len(raw))
	for _, m := range raw {
		combined := cloneStringMap(base)
		for k, v := range m {
			if len(v) > 0 {
				combined[k] = v[0]
			}
		}
		if !isExcluded(combined, exclude) {
			out = append(out, combined)
		}
	}
	if len(out) == 0 {
		return []map[string]string{}
	}
	return out
}

func cartesianParamMaps(matrix map[string][][]string) []map[string][]string {
	if len(matrix) == 0 {
		return []map[string][]string{{}}
	}
	for name, values := range matrix {
		rest := maps.Clone(matrix)
		delete(rest, name)
		sub := cartesianParamMaps(rest)
		var out []map[string][]string
		for _, valueRow := range values {
			for _, partial := range sub {
				cp := maps.Clone(partial)
				cp[name] = valueRow
				out = append(out, cp)
			}
		}
		return out
	}
	return nil
}

func isExcluded(paramMap map[string]string, exclude []buildspec.ParamMap) bool {
	for _, ex := range exclude {
		if ex.Params == nil {
			continue
		}
		if covers(paramMap, ex.Params) {
			return true
		}
	}
	return false
}

func covers(paramMap, covering map[string]string) bool {
	for k, want := range covering {
		if want == "" {
			continue
		}
		if paramMap[k] != want {
			return false
		}
	}
	return true
}

func cloneStringMap(m map[string]string) map[string]string {
	if len(m) == 0 {
		return make(map[string]string)
	}
	out := make(map[string]string, len(m))
	for k, v := range m {
		out[k] = v
	}
	return out
}
