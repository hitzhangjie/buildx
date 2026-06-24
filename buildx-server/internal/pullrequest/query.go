package pullrequest

import (
	"context"
	"regexp"
	"strconv"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

var numberQueryPattern = regexp.MustCompile(`(?i)^\s*"number"\s+is\s+"([^"#]+)#(\d+)"\s*$`)
var includesIssueQueryPattern = regexp.MustCompile(`(?i)"includes issue"\s+is\s+"([^"#]+)#(\d+)"`)

// ParseIncludesIssueQuery extracts project path and issue number from query.
func ParseIncludesIssueQuery(query string) (projectPath string, number int, ok bool) {
	m := includesIssueQueryPattern.FindStringSubmatch(query)
	if m == nil {
		return "", 0, false
	}
	n, err := strconv.Atoi(m[2])
	if err != nil || n <= 0 {
		return "", 0, false
	}
	return strings.TrimSpace(m[1]), n, true
}

// ParseNumberQuery extracts project path and PR number from OneDev-style query.
func ParseNumberQuery(query string) (projectPath string, number int, ok bool) {
	m := numberQueryPattern.FindStringSubmatch(query)
	if m == nil {
		return "", 0, false
	}
	n, err := strconv.Atoi(m[2])
	if err != nil || n <= 0 {
		return "", 0, false
	}
	return strings.TrimSpace(m[1]), n, true
}

// ResolveByNumberQuery looks up a pull request using query syntax.
func (s *DBStore) ResolveByNumberQuery(ctx context.Context, query string, pathToProjectID map[string]int64) (*model.PullRequest, error) {
	path, number, ok := ParseNumberQuery(query)
	if !ok {
		return nil, ErrNotFound
	}
	projectID, found := pathToProjectID[path]
	if !found {
		for p, id := range pathToProjectID {
			if strings.EqualFold(p, path) {
				projectID = id
				found = true
				break
			}
		}
	}
	if !found {
		return nil, ErrNotFound
	}
	return s.GetByNumber(ctx, projectID, number)
}
