package git

import (
	"context"
	"fmt"
	"path"
	"regexp"
	"strings"

	"github.com/go-git/go-git/v5/plumbing"
)

// ErrQueryTooGeneral is returned when a symbol search query contains only wildcards.
var ErrQueryTooGeneral = errQueryTooGeneral{}

type errQueryTooGeneral struct{}

func (errQueryTooGeneral) Error() string {
	return "query too general"
}

type symbolPattern struct {
	re      *regexp.Regexp
	typ     string
	primary bool
	group   int
}

var symbolPatterns = []symbolPattern{
	// Go
	{regexp.MustCompile(`^\s*func\s+(?:\([^)]*\)\s+)?([A-Za-z_]\w*)\s*[\(<]`), "func", true, 1},
	{regexp.MustCompile(`^\s*type\s+([A-Za-z_]\w*)\s+(?:struct|interface)`), "type", true, 1},
	{regexp.MustCompile(`^\s*const\s+([A-Za-z_]\w*)\b`), "const", true, 1},
	{regexp.MustCompile(`^\s*var\s+([A-Za-z_]\w*)\b`), "var", true, 1},

	// Java / Kotlin / C#
	{regexp.MustCompile(`^\s*(?:public|private|protected|static|final|abstract|sealed|\s)*\s*class\s+([A-Za-z_]\w*)\b`), "class", true, 1},
	{regexp.MustCompile(`^\s*(?:public|private|protected|static|final|abstract|\s)*\s*interface\s+([A-Za-z_]\w*)\b`), "interface", true, 1},
	{regexp.MustCompile(`^\s*(?:public|private|protected|static|final|\s)*\s*enum\s+([A-Za-z_]\w*)\b`), "enum", true, 1},
	{regexp.MustCompile(`^\s*(?:public|private|protected|static|final|synchronized|\s)*[\w<>,\[\]\s]+\s+([A-Za-z_]\w*)\s*\([^)]*\)\s*(?:throws\b|[{;])`), "method", false, 1},

	// Python
	{regexp.MustCompile(`^\s*class\s+([A-Za-z_]\w*)\s*[:(]`), "class", true, 1},
	{regexp.MustCompile(`^\s*def\s+([A-Za-z_]\w*)\s*\(`), "func", false, 1},
	{regexp.MustCompile(`^\s*async\s+def\s+([A-Za-z_]\w*)\s*\(`), "func", false, 1},

	// JavaScript / TypeScript
	{regexp.MustCompile(`^\s*(?:export\s+)?(?:async\s+)?function\s*\*?\s+([A-Za-z_$]\w*)\s*\(`), "func", true, 1},
	{regexp.MustCompile(`^\s*(?:export\s+)?class\s+([A-Za-z_$]\w*)\b`), "class", true, 1},
	{regexp.MustCompile(`^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$]\w*)\s*[=:(]`), "var", true, 1},
	{regexp.MustCompile(`^\s*(?:public|private|protected|static|readonly|\s)*([A-Za-z_$]\w*)\s*\([^)]*\)\s*[:{]`), "method", false, 1},

	// Rust
	{regexp.MustCompile(`^\s*(?:pub\s+)?fn\s+([A-Za-z_]\w*)\s*[\(<]`), "func", true, 1},
	{regexp.MustCompile(`^\s*(?:pub\s+)?struct\s+([A-Za-z_]\w*)\b`), "struct", true, 1},
	{regexp.MustCompile(`^\s*(?:pub\s+)?enum\s+([A-Za-z_]\w*)\b`), "enum", true, 1},
	{regexp.MustCompile(`^\s*(?:pub\s+)?trait\s+([A-Za-z_]\w*)\b`), "trait", true, 1},

	// C / C++
	{regexp.MustCompile(`^\s*(?:class|struct)\s+([A-Za-z_]\w*)\b`), "class", true, 1},
}

var classLinePattern = regexp.MustCompile(`^\s*class\s+([A-Za-z_$]\w*)\b`)

// SearchSymbols searches symbol definitions at the given revision.
// Symbol names support * and ? wildcards. Primary symbols are searched first
// when Primary is nil (combined search for advanced search UI).
func (r *Repository) SearchSymbols(ctx context.Context, opts SymbolSearchOptions) ([]SearchSymbolHit, bool, error) {
	if opts.MaxResults <= 0 {
		opts.MaxResults = 100
	}
	if opts.Query == "" {
		return nil, false, nil
	}
	if isQueryTooGeneral(opts.Query) {
		return nil, false, ErrQueryTooGeneral
	}

	if opts.Primary != nil {
		return r.searchSymbolsPass(ctx, opts, *opts.Primary)
	}

	primaryOpts := opts
	primary := true
	primaryOpts.Primary = &primary
	hits, _, err := r.searchSymbolsPass(ctx, primaryOpts, true)
	if err != nil {
		return nil, false, err
	}
	if len(hits) >= opts.MaxResults {
		return hits, true, nil
	}

	secondaryOpts := opts
	secondaryOpts.MaxResults = opts.MaxResults - len(hits)
	secondary := false
	secondaryOpts.Primary = &secondary
	more, hasMore, err := r.searchSymbolsPass(ctx, secondaryOpts, false)
	if err != nil {
		return nil, false, err
	}
	hits = append(hits, more...)
	return dedupeSymbolHits(hits), hasMore, nil
}

func (r *Repository) searchSymbolsPass(ctx context.Context, opts SymbolSearchOptions, primary bool) ([]SearchSymbolHit, bool, error) {
	hash, err := r.inner.ResolveRevision(plumbing.Revision(opts.Revision))
	if err != nil {
		return nil, false, err
	}

	commit, err := r.inner.CommitObject(*hash)
	if err != nil {
		return nil, false, err
	}

	tree, err := commit.Tree()
	if err != nil {
		return nil, false, err
	}

	if opts.Directory != "" {
		dirTree, dirErr := tree.Tree(opts.Directory)
		if dirErr != nil {
			return nil, false, nil
		}
		tree = dirTree
	}

	var filePatterns []string
	if opts.FileNames != "" {
		for _, p := range strings.Split(opts.FileNames, ",") {
			p = strings.TrimSpace(p)
			if p != "" {
				filePatterns = append(filePatterns, p)
			}
		}
	}

	hits := make([]SearchSymbolHit, 0, opts.MaxResults)
	iter := tree.Files()
	defer iter.Close()

	for {
		select {
		case <-ctx.Done():
			return hits, false, ctx.Err()
		default:
		}

		file, err := iter.Next()
		if err != nil {
			break
		}

		fileName := file.Name
		if idx := strings.LastIndexByte(fileName, '/'); idx >= 0 {
			fileName = fileName[idx+1:]
		}
		if len(filePatterns) > 0 && !matchesAnyPattern(fileName, filePatterns, opts.CaseSensitive) {
			continue
		}

		isBin, err := file.IsBinary()
		if err != nil || isBin {
			continue
		}

		content, err := file.Contents()
		if err != nil {
			continue
		}

		fullPath := file.Name
		if opts.Directory != "" {
			fullPath = opts.Directory + "/" + file.Name
		}

		fileHits := extractMatchingSymbols(content, fullPath, opts.Query, opts.CaseSensitive, primary)
		for _, hit := range fileHits {
			hits = append(hits, hit)
			if len(hits) >= opts.MaxResults {
				_, nextErr := iter.Next()
				return hits, nextErr == nil, nil
			}
		}
	}

	return hits, false, nil
}

func extractMatchingSymbols(content, filePath, query string, caseSensitive, primaryFilter bool) []SearchSymbolHit {
	lines := strings.Split(content, "\n")
	namespace := detectNamespace(lines, path.Ext(filePath))
	var classStack []string

	var hits []SearchSymbolHit
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" || strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
			continue
		}

		if m := classLinePattern.FindStringSubmatch(line); len(m) == 2 {
			classStack = append(classStack, m[1])
		} else if strings.HasPrefix(trimmed, "}") && len(classStack) > 0 {
			classStack = classStack[:len(classStack)-1]
		}

		for _, pat := range symbolPatterns {
			if pat.primary != primaryFilter {
				continue
			}
			m := pat.re.FindStringSubmatch(line)
			if len(m) <= pat.group {
				continue
			}
			name := m[pat.group]
			if !symbolNameMatches(query, name, caseSensitive) {
				continue
			}

			matchRange := rangeOfSymbolMatch(query, name, caseSensitive)
			ns := namespace
			if len(classStack) > 0 {
				parent := classStack[len(classStack)-1]
				if ns != "" {
					ns = ns + "." + parent
				} else {
					ns = parent
				}
			}

			hits = append(hits, SearchSymbolHit{
				FilePath:    filePath,
				SymbolName:  name,
				SymbolType:  pat.typ,
				Namespace:   ns,
				LineNo:      i + 1,
				LineContent: strings.TrimRight(line, "\r"),
				Match:       matchRange,
			})
			break
		}
	}
	return hits
}

func detectNamespace(lines []string, ext string) string {
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		switch ext {
		case ".go":
			if strings.HasPrefix(trimmed, "package ") {
				return strings.Fields(trimmed)[1]
			}
		case ".java", ".kt", ".scala":
			if strings.HasPrefix(trimmed, "package ") {
				pkg := strings.TrimSuffix(strings.TrimPrefix(trimmed, "package "), ";")
				return strings.TrimSpace(pkg)
			}
		case ".cs":
			if strings.HasPrefix(trimmed, "namespace ") {
				ns := strings.TrimSuffix(strings.TrimPrefix(trimmed, "namespace "), "{")
				return strings.TrimSpace(ns)
			}
		}
	}
	return ""
}

func symbolNameMatches(query, name string, caseSensitive bool) bool {
	q := query
	n := name
	if !caseSensitive {
		q = strings.ToLower(q)
		n = strings.ToLower(n)
	}
	return globMatch(q, n)
}

func rangeOfSymbolMatch(query, name string, caseSensitive bool) *LinearRange {
	q := query
	n := name
	if !caseSensitive {
		q = strings.ToLower(q)
		n = strings.ToLower(n)
	}
	if !hasWildcard(q) {
		idx := strings.Index(n, q)
		if idx < 0 {
			return nil
		}
		return &LinearRange{From: idx, To: idx + len(q)}
	}
	// Approximate highlight for wildcard: highlight full name when matched.
	if globMatch(q, n) {
		return &LinearRange{From: 0, To: len(name)}
	}
	return nil
}

func isQueryTooGeneral(query string) bool {
	for _, ch := range query {
		if ch != '*' && ch != '?' {
			return false
		}
	}
	return len(query) > 0
}

func dedupeSymbolHits(hits []SearchSymbolHit) []SearchSymbolHit {
	if len(hits) < 2 {
		return hits
	}
	seen := make(map[string]struct{}, len(hits))
	out := make([]SearchSymbolHit, 0, len(hits))
	for _, hit := range hits {
		key := fmt.Sprintf("%s\x00%s\x00%d", hit.FilePath, hit.SymbolName, hit.LineNo)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, hit)
	}
	return out
}
