package build

import (
	"regexp"
	"strconv"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// QueryFilter holds parsed build query criteria (subset of OneDev BuildQuery).
type QueryFilter struct {
	ProjectPath       string
	ProjectID         int64
	JobName           string
	Status            string
	Number            int
	NumberProjectPath string
	RefName           string
	CommitHash        string
	FreeText          string
	OrderByFinishDate bool
}

var (
	buildProjectIsRE = regexp.MustCompile(`(?i)"Project"\s+is\s+"([^"]+)"`)
	buildJobIsRE     = regexp.MustCompile(`(?i)"Job"\s+is\s+"([^"]+)"`)
	buildStatusIsRE  = regexp.MustCompile(`(?i)"Status"\s+is\s+(\w+)`)
	buildNumberIsRE  = regexp.MustCompile(`(?i)"Number"\s+is\s+"([^"#]+)#(\d+)"`)
	buildBranchIsRE  = regexp.MustCompile(`(?i)"Branch"\s+is\s+"([^"]+)"`)
	buildCommitIsRE  = regexp.MustCompile(`(?i)"Commit"\s+is\s+"([^"]+)"`)
	orderByFinishRE  = regexp.MustCompile(`(?i)order\s+by\s+"Finish Date"\s+desc`)
)

// ParseQuery parses a subset of the OneDev build query language.
func ParseQuery(query string) QueryFilter {
	query = strings.TrimSpace(query)
	if query == "" {
		return QueryFilter{}
	}

	filter := QueryFilter{}
	if m := buildProjectIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.ProjectPath = m[1]
	}
	if m := buildJobIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.JobName = m[1]
	}
	if m := buildStatusIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.Status = normalizeStatus(m[1])
	}
	if m := buildNumberIsRE.FindStringSubmatch(query); len(m) == 3 {
		filter.NumberProjectPath = m[1]
		if n, err := strconv.Atoi(m[2]); err == nil {
			filter.Number = n
		}
	}
	if m := buildBranchIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.RefName = "refs/heads/" + m[1]
	}
	if m := buildCommitIsRE.FindStringSubmatch(query); len(m) == 2 {
		filter.CommitHash = m[1]
	}
	if orderByFinishRE.MatchString(query) {
		filter.OrderByFinishDate = true
	}

	if filter.ProjectPath == "" && filter.JobName == "" && filter.Status == "" &&
		filter.Number == 0 && filter.RefName == "" && filter.CommitHash == "" {
		if !strings.Contains(query, `"`) && !strings.Contains(strings.ToLower(query), "order by") {
			filter.FreeText = query
		}
	}
	return filter
}

func normalizeStatus(s string) string {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "successful", "success":
		return string(model.BuildStatusSuccessful)
	case "failed", "fail":
		return string(model.BuildStatusFailed)
	case "running":
		return string(model.BuildStatusRunning)
	case "pending":
		return string(model.BuildStatusPending)
	case "cancelled", "canceled":
		return string(model.BuildStatusCancelled)
	case "waiting":
		return string(model.BuildStatusWaiting)
	case "timed_out", "timedout", "timeout":
		return string(model.BuildStatusTimedOut)
	default:
		return strings.ToUpper(s)
	}
}
