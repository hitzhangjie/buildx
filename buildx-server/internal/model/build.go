package model

import "time"

const BuildMaxDescriptionLen = 12000

// BuildStatus is the lifecycle state of a CI build (maps to Build.Status in OneDev).
type BuildStatus string

const (
	BuildStatusWaiting    BuildStatus = "WAITING"
	BuildStatusPending    BuildStatus = "PENDING"
	BuildStatusRunning    BuildStatus = "RUNNING"
	BuildStatusFailed     BuildStatus = "FAILED"
	BuildStatusCancelled  BuildStatus = "CANCELLED"
	BuildStatusTimedOut   BuildStatus = "TIMED_OUT"
	BuildStatusSuccessful BuildStatus = "SUCCESSFUL"
)

// Build is a single CI/CD job execution (maps to o_Build).
type Build struct {
	ID              int64       `json:"id"`
	ProjectID       int64       `json:"projectId"`
	Project         *Project    `json:"project,omitempty"`
	NumberScopeID   int64       `json:"numberScopeId"`
	Number          int         `json:"number"`
	JobName         string      `json:"jobName"`
	Status          BuildStatus `json:"status"`
	RefName         string      `json:"refName"`
	CommitHash      string      `json:"commitHash"`
	Version         string      `json:"version"`
	Description     string      `json:"description"`
	SubmitDate      time.Time   `json:"submitDate"`
	PendingDate     *time.Time  `json:"pendingDate,omitempty"`
	RunningDate     *time.Time  `json:"runningDate,omitempty"`
	FinishDate      *time.Time  `json:"finishDate,omitempty"`
	RetryDate       *time.Time  `json:"retryDate,omitempty"`
	PendingDuration int64       `json:"pendingDuration"`
	RunningDuration int64       `json:"runningDuration"`
	SubmitReason    string      `json:"submitReason"`
	SubmitSequence  int64       `json:"submitSequence"`
	Submitter       *User       `json:"submitter,omitempty"`
	Canceller       *User       `json:"canceller,omitempty"`
	Paused          bool        `json:"paused"`
	UUID            string      `json:"uuid"`
	Token           string      `json:"-"`
	WorkDirPath     string      `json:"workDirPath,omitempty"`
	CheckoutPaths   []string    `json:"checkoutPaths,omitempty"`
}

// BuildParam is a job parameter on a build (maps to o_BuildParam).
type BuildParam struct {
	ID      int64  `json:"id"`
	BuildID int64  `json:"buildId"`
	Name    string `json:"name"`
	Type    string `json:"type"`
	Value   string `json:"value"`
}

// BuildLabel is a label attached to a build (maps to o_BuildLabel).
type BuildLabel struct {
	ID      int64  `json:"id"`
	BuildID int64  `json:"buildId"`
	Name    string `json:"name"`
}

// BuildDependence represents a dependency relationship between two builds.
// Maps to OneDev's BuildDependence entity.
// The Dependent build depends on the Dependency build.
type BuildDependence struct {
	ID                int64  `json:"id"`
	DependentID       int64  `json:"dependentId"`
	DependencyID      int64  `json:"dependencyId"`
	RequireSuccessful bool   `json:"requireSuccessful"`
	Artifacts         string `json:"artifacts,omitempty"`
	DestinationPath   string `json:"destinationPath,omitempty"`
}
