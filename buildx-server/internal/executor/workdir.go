package executor

import (
	"fmt"
	"path/filepath"
	"strings"
)

// BuildWorkDir returns the job checkout/work directory under base.
// Layout: {base}/{projectId}-{projectName}/{jobId}-{jobName}/{buildNumber}
// Example: data/builds/1-buildx/1-job1/8
func BuildWorkDir(base string, jc *JobContext) string {
	if jc == nil {
		return base
	}
	parts := []string{
		base,
		projectDirSegment(jc.ProjectID, jc.ProjectName, jc.ProjectPath),
		jobDirSegment(jc.JobID, jc.JobName),
		fmt.Sprintf("%d", jc.BuildNumber),
	}
	return filepath.Join(parts...)
}

func projectDirSegment(projectID int64, projectName, projectPath string) string {
	name := sanitizePathSegment(projectName, "")
	if name == "" || name == "_" {
		name = sanitizePathSegment(lastPathSegment(projectPath), "project")
	}
	if projectID > 0 {
		return fmt.Sprintf("%d-%s", projectID, name)
	}
	return name
}

func jobDirSegment(jobID int, jobName string) string {
	name := sanitizePathSegment(jobName, "job")
	if jobID > 0 {
		return fmt.Sprintf("%d-%s", jobID, name)
	}
	return name
}

func lastPathSegment(projectPath string) string {
	projectPath = strings.Trim(projectPath, "/")
	if projectPath == "" {
		return ""
	}
	parts := strings.Split(projectPath, "/")
	return parts[len(parts)-1]
}

func sanitizePathSegment(s, fallback string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		if fallback != "" {
			return fallback
		}
		return "_"
	}
	var b strings.Builder
	for _, r := range s {
		switch {
		case r >= 'a' && r <= 'z', r >= 'A' && r <= 'Z', r >= '0' && r <= '9', r == '-', r == '_', r == '.':
			b.WriteRune(r)
		default:
			b.WriteRune('_')
		}
	}
	result := strings.Trim(b.String(), "._")
	if result == "" {
		if fallback != "" {
			return fallback
		}
		return "_"
	}
	return result
}
