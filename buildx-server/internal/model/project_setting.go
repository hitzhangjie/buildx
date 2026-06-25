package model

// ProjectSetting mirrors OneDev's ProjectSetting DTO — all project settings in one
// container. Each sub-model is serialized as JSON in a separate TEXT column on the
// o_Project table, mirroring OneDev's JPA @Lob approach.
type ProjectSetting struct {
	BranchProtections       []*BranchProtection       `json:"branchProtections"`
	TagProtections          []*TagProtection          `json:"tagProtections"`
	IssueSetting            *IssueSetting             `json:"issueSetting,omitempty"`
	BuildSetting            *BuildSetting             `json:"buildSetting,omitempty"`
	PullRequestSetting      *PullRequestSetting       `json:"pullRequestSetting,omitempty"`
	PackSetting             *PackSetting              `json:"packSetting,omitempty"`
	WorkspaceSetting        *WorkspaceSetting         `json:"workspaceSetting,omitempty"`
	NamedCommitQueries      []*NamedCommitQuery       `json:"namedCommitQueries,omitempty"`
	NamedCodeCommentQueries []*NamedCodeCommentQuery  `json:"namedCodeCommentQueries,omitempty"`
	WebHooks                []*WebHook                `json:"webHooks,omitempty"`
	ContributedSettings     map[string]any            `json:"contributedSettings,omitempty"`
	GitPackConfig           *GitPackConfig            `json:"gitPackConfig,omitempty"`
	CodeAnalysisSetting     *CodeAnalysisSetting      `json:"codeAnalysisSetting,omitempty"`
	AiSetting               *AiSetting                `json:"aiSetting,omitempty"`
	WorkspaceSpecs          []*WorkspaceSpec          `json:"workspaceSpecs,omitempty"`
}

// BranchProtection mirrors OneDev's BranchProtection model.
type BranchProtection struct {
	Enabled               bool     `json:"enabled"`
	Branches              string   `json:"branches"`
	UserMatch             string   `json:"userMatch,omitempty"`
	PreventForcedPush     bool     `json:"preventForcedPush"`
	PreventDeletion       bool     `json:"preventDeletion"`
	PreventCreation       bool     `json:"preventCreation"`
	CommitSignatureRequired bool   `json:"commitSignatureRequired"`
	ReviewRequirement     string   `json:"reviewRequirement,omitempty"`
	JobNames              []string `json:"jobNames,omitempty"`
	RequireStrictBuilds   bool     `json:"requireStrictBuilds"`
}

// TagProtection mirrors OneDev's TagProtection model.
type TagProtection struct {
	Enabled                 bool   `json:"enabled"`
	Tags                    string `json:"tags"`
	UserMatch               string `json:"userMatch,omitempty"`
	PreventUpdate           bool   `json:"preventUpdate"`
	PreventDeletion         bool   `json:"preventDeletion"`
	PreventCreation         bool   `json:"preventCreation"`
	CommitSignatureRequired bool   `json:"commitSignatureRequired"`
}

// IssueSetting mirrors OneDev's ProjectIssueSetting.
type IssueSetting struct {
	ListFields       []string           `json:"listFields,omitempty"`
	ListLinks        []string           `json:"listLinks,omitempty"`
	BoardSpecs       []*BoardSpec       `json:"boardSpecs,omitempty"`
	NamedQueries     []*NamedIssueQuery `json:"namedQueries,omitempty"`
	TransitionSpecs  []*TransitionSpec  `json:"transitionSpecs,omitempty"`
	TimesheetSetting *TimesheetSetting  `json:"timesheetSetting,omitempty"`
	BranchPrefix     string             `json:"branchPrefix,omitempty"`
}

// BoardSpec mirrors OneDev's BoardSpec.
type BoardSpec struct {
	Name             string   `json:"name"`
	BaseQuery        string   `json:"baseQuery,omitempty"`
	BacklogBaseQuery string   `json:"backlogBaseQuery,omitempty"`
	IdentifyField    string   `json:"identifyField"`
	Columns          []string `json:"columns"`
	EditColumns      []string `json:"editColumns,omitempty"`
}

// NamedIssueQuery mirrors OneDev's NamedIssueQuery.
type NamedIssueQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// TransitionSpec mirrors OneDev's StateTransitionSpec.
type TransitionSpec struct {
	FromStates  []string `json:"fromStates"`
	ToState     string   `json:"toState"`
	Trigger     string   `json:"trigger,omitempty"`
	Authorized  string   `json:"authorized,omitempty"`
}

// TimesheetSetting mirrors OneDev's TimesheetSetting.
type TimesheetSetting struct {
	DefaultWeeklyHours float64 `json:"defaultWeeklyHours"`
	MaxMonthlyHours    float64 `json:"maxMonthlyHours"`
}

// BuildSetting mirrors OneDev's ProjectBuildSetting.
type BuildSetting struct {
	ListParams               []string                 `json:"listParams,omitempty"`
	NamedQueries             []*NamedBuildQuery       `json:"namedQueries,omitempty"`
	JobProperties            []*JobProperty           `json:"jobProperties,omitempty"`
	JobSecrets               []*JobSecret             `json:"jobSecrets,omitempty"`
	BuildPreservations       []*BuildPreservation     `json:"buildPreservations,omitempty"`
	DefaultFixedIssueFilters []*DefaultFixedIssueFilter `json:"defaultFixedIssueFilters,omitempty"`
	CachePreserveDays        *int                     `json:"cachePreserveDays,omitempty"`
}

// NamedBuildQuery mirrors OneDev's NamedBuildQuery.
type NamedBuildQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// JobSecret mirrors OneDev's JobSecret.
type JobSecret struct {
	Name          string `json:"name"`
	Value         string `json:"value,omitempty"` // masked on read
	Authorization string `json:"authorization,omitempty"`
	Archived      bool   `json:"archived"`
}

// JobProperty mirrors OneDev's JobProperty.
type JobProperty struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// BuildPreservation mirrors OneDev's BuildPreservation.
type BuildPreservation struct {
	Condition string `json:"condition"`
	Count     int    `json:"count"`
}

// DefaultFixedIssueFilter mirrors OneDev's DefaultFixedIssueFilter.
type DefaultFixedIssueFilter struct {
	Query string `json:"query"`
}

// PullRequestSetting mirrors OneDev's ProjectPullRequestSetting.
type PullRequestSetting struct {
	NamedQueries                []*NamedPullRequestQuery `json:"namedQueries,omitempty"`
	DefaultMergeStrategy        string                   `json:"defaultMergeStrategy,omitempty"`
	DefaultAssignees            []string                 `json:"defaultAssignees,omitempty"`
	DeleteSourceBranchAfterMerge *bool                   `json:"deleteSourceBranchAfterMerge,omitempty"`
}

// NamedPullRequestQuery mirrors OneDev's NamedPullRequestQuery.
type NamedPullRequestQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// PackSetting mirrors OneDev's ProjectPackSetting.
type PackSetting struct {
	NamedQueries []*NamedPackQuery `json:"namedQueries,omitempty"`
}

// NamedPackQuery mirrors OneDev's NamedPackQuery.
type NamedPackQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// WorkspaceSetting mirrors OneDev's ProjectWorkspaceSetting.
type WorkspaceSetting struct {
	NamedQueries []*NamedWorkspaceQuery `json:"namedQueries,omitempty"`
}

// NamedWorkspaceQuery mirrors OneDev's NamedWorkspaceQuery.
type NamedWorkspaceQuery struct {
	Name  string `json:"name"`
	Query string `json:"query"`
}

// WebHook mirrors OneDev's WebHook.
type WebHook struct {
	ID         int64       `json:"id"`
	PostURL    string      `json:"postUrl"`
	EventTypes []string    `json:"eventTypes"`
	Secret     string      `json:"secret,omitempty"`
	Headers    []*WebHookHeader `json:"headers,omitempty"`
	Enabled    bool        `json:"enabled"`
}

// WebHookHeader is a custom header for a webhook.
type WebHookHeader struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

// GitPackConfig mirrors OneDev's GitPackConfig.
type GitPackConfig struct {
	WindowMemory  string `json:"windowMemory,omitempty"`
	PackSizeLimit string `json:"packSizeLimit,omitempty"`
	Threads       string `json:"threads,omitempty"`
	Window        string `json:"window,omitempty"`
}

// CodeAnalysisSetting mirrors OneDev's CodeAnalysisSetting.
type CodeAnalysisSetting struct {
	AnalysisFiles string `json:"analysisFiles,omitempty"`
}

// AiSetting mirrors OneDev's ProjectAiSetting.
type AiSetting struct {
	Enabled bool   `json:"enabled"`
	Model   string `json:"model,omitempty"`
}

// NamedCommitQuery mirrors OneDev's NamedCommitQuery.
type NamedCommitQuery struct {
	Name  string `json:"name"`
	Query string `json:"query,omitempty"`
}

// NamedCodeCommentQuery mirrors OneDev's NamedCodeCommentQuery.
type NamedCodeCommentQuery struct {
	Name  string `json:"name"`
	Query string `json:"query,omitempty"`
}
