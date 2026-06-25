package model

import "time"

// WorkspaceStatus represents the lifecycle state of a workspace.
type WorkspaceStatus string

const (
	WorkspaceStatusPending  WorkspaceStatus = "PENDING"
	WorkspaceStatusActive   WorkspaceStatus = "ACTIVE"
	WorkspaceStatusInactive WorkspaceStatus = "INACTIVE"
)

// Workspace is a sandboxed development environment created from a project branch/commit.
// Maps to OneDev's io.onedev.server.model.Workspace.
type Workspace struct {
	ID              int64           `json:"id"`
	NumberScopeID   int64           `json:"numberScopeId"`
	Number          int64           `json:"number"`
	UserID          int64           `json:"userId"`
	User            *User           `json:"user,omitempty"`
	ProjectID       int64           `json:"projectId"`
	Project         *Project        `json:"project,omitempty"`
	SpecName        string          `json:"specName"`
	Branch          string          `json:"branch,omitempty"`
	CommitHash      string          `json:"commitHash"`
	Status          WorkspaceStatus `json:"status"`
	CreateDate      time.Time       `json:"createDate"`
	ActiveDate      *time.Time      `json:"activeDate,omitempty"`
	InactiveDate    *time.Time      `json:"inactiveDate,omitempty"`
	ProvisionerName string          `json:"provisionerName,omitempty"`
	ServerAddress   string          `json:"serverAddress,omitempty"`
	AgentID         *int64          `json:"agentId,omitempty"`
	Agent           *Agent          `json:"agent,omitempty"`
	Token           string          `json:"-"` // never serialized to JSON
}

// WorkspaceSpec is the detailed specification for creating workspaces.
// Maps to OneDev's io.onedev.server.model.support.workspace.spec.WorkspaceSpec.
type WorkspaceSpec struct {
	Name            string          `json:"name"`
	Description     string          `json:"description,omitempty"`
	Provisioner     string          `json:"provisioner,omitempty"`
	RunInContainer  bool            `json:"runInContainer"`
	Image           string          `json:"image"`
	Shell           string          `json:"shell"` // "posix", "powershell", "windows-batch"
	EnvVars         []WorkspaceEnvVar  `json:"envVars,omitempty"`
	ConfigFiles     []WorkspaceConfigFile `json:"configFiles,omitempty"`
	ShortcutConfigs []WorkspaceShortcut  `json:"shortcutConfigs,omitempty"`
	UserDatas       []WorkspaceUserData  `json:"userDatas,omitempty"`
	CacheConfigs    []WorkspaceCacheConfig `json:"cacheConfigs,omitempty"`
	RetrieveLfs     bool            `json:"retrieveLfs"`
	RunAs           string          `json:"runAs"` // "0:0" default
	ContainerPorts  []int           `json:"containerPorts,omitempty"`
	RegistryLogins  []WorkspaceRegistryLogin `json:"registryLogins,omitempty"`
	TaskAutomation  *WorkspaceTaskAutomation `json:"taskAutomation,omitempty"`
}

// WorkspaceEnvVar defines an environment variable for the workspace.
type WorkspaceEnvVar struct {
	Name   string `json:"name"`
	Value  string `json:"value"`
	Secret bool   `json:"secret"`
}

// WorkspaceConfigFile defines a config file to be placed in the workspace.
type WorkspaceConfigFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
}

// WorkspaceShortcut defines a quick-access terminal command.
type WorkspaceShortcut struct {
	Name    string `json:"name"`
	Command string `json:"command"`
}

// WorkspaceUserData defines persistent user data paths.
type WorkspaceUserData struct {
	Paths []string `json:"paths"`
}

// WorkspaceCacheConfig defines cache configuration for workspace.
type WorkspaceCacheConfig struct {
	Key            string   `json:"key"`
	ChecksumFiles  []string `json:"checksumFiles,omitempty"`
	Paths          []string `json:"paths"`
	UploadStrategy string   `json:"uploadStrategy,omitempty"`
}

// WorkspaceRegistryLogin defines container registry credentials.
type WorkspaceRegistryLogin struct {
	RegistryURL string `json:"registryUrl"`
	UserName    string `json:"userName"`
	Password    string `json:"password"`
}

// WorkspaceTaskAutomation defines AI-driven task automation config.
type WorkspaceTaskAutomation struct {
	RunTaskCmd                 string   `json:"runTaskCmd"`
	ApplicableAis              []string `json:"applicableAis,omitempty"`
	DeleteWorkspaceIfSucceeded bool     `json:"deleteWorkspaceIfSucceeded"`
}

// WorkspaceQueryPersonalization stores saved workspace queries for a user in a project.
type WorkspaceQueryPersonalization struct {
	UserID    int64                 `json:"userId"`
	ProjectID int64                 `json:"projectId"`
	Queries   []*NamedWorkspaceQuery `json:"queries"`
}
