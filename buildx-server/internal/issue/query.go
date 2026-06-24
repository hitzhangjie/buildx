package issue

import (
	"regexp"
	"strconv"
	"strings"
)

// QueryFilter holds parsed issue query criteria (subset of OneDev IssueQuery).
type QueryFilter struct {
	ProjectPath       string
	ProjectID         int64
	State             string
	Number            int
	NumberProjectPath string
	TitleContains     string
	IterationID       int64
	IterationName     string
	UnscheduledOnly   bool
}

var (
	projectIsRE  = regexp.MustCompile(`(?i)"Project"\s+is\s+"([^"]+)"`)
	stateIsRE    = regexp.MustCompile(`(?i)"State"\s+is\s+"([^"]+)"`)
	numberIsRE   = regexp.MustCompile(`(?i)"Number"\s+is\s+"([^"#]+)#(\d+)"`)
	iterationIsRE    = regexp.MustCompile(`(?i)"Iteration"\s+is\s+"([^"]+)"`)
	iterationEmptyRE = regexp.MustCompile(`(?i)"Iteration"\s+is\s+empty`)
	titleContainsRE  = regexp.MustCompile(`(?i)"Title"\s+contains\s+"([^"]+)"`)
)

// ParseQuery parses a subset of the OneDev issue query language.
// Unrecognized non-empty query text is treated as a title substring search.
func ParseQuery(query string) QueryFilter {
	query = strings.TrimSpace(query)
	if query == "" {
		return QueryFilter{}
	}

	filter := QueryFilter{}
	if m := projectIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.ProjectPath = m[1]
	}
	if m := stateIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.State = m[1]
	}
	if m := numberIsRE.FindStringSubmatch(query); len(m) == 3 {
		filter.NumberProjectPath = m[1]
		if n, err := strconv.Atoi(m[2]); err == nil {
			filter.Number = n
		}
	}
	if m := titleContainsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.TitleContains = m[1]
	}
	if iterationEmptyRE.MatchString(query) {
		filter.UnscheduledOnly = true
	}
	if m := iterationIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.IterationName = m[1]
	}

	if filter.ProjectPath == "" && filter.State == "" && filter.Number == 0 &&
		filter.TitleContains == "" && filter.IterationName == "" && !filter.UnscheduledOnly {
		// Free-text fallback: search title (common when users type without quotes).
		if !strings.Contains(query, `"`) {
			filter.TitleContains = query
		}
	}
	return filter
}
