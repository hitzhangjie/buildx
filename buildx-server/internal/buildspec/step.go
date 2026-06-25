package buildspec

import (
	"errors"
	"fmt"

	"gopkg.in/yaml.v3"
)

// StepType identifies the type of a job step.
type StepType string

const (
	StepTypeCommand           StepType = "command"
	StepTypeCheckout          StepType = "checkout"
	StepTypeSetupCache        StepType = "setup-cache"
	StepTypePublishArtifact   StepType = "publish-artifact"
	StepTypePublishReport     StepType = "publish-report"
	StepTypeCreateBranch      StepType = "create-branch"
	StepTypeCreateTag         StepType = "create-tag"
	StepTypeSetBuildVersion   StepType = "set-build-version"
	StepTypeCreatePullRequest StepType = "create-pull-request"
	StepTypeBuildImage        StepType = "build-image"
	StepTypePushImage         StepType = "push-image"
	StepTypeRunContainer      StepType = "run-container"
	StepTypePullImage         StepType = "pull-image"
	StepTypeUseTemplate       StepType = "use-template"
)

// Step is the interface for all step types (maps to Step.java in OneDev).
type Step interface {
	GetName() string
	GetCondition() string
	GetEnabled() bool
	StepType() StepType
}

// StepBase is embedded in all concrete step types to provide common fields.
type StepBase struct {
	Name      string `yaml:"name,omitempty" json:"name,omitempty"`
	Condition string `yaml:"condition,omitempty" json:"condition,omitempty"`
	Enabled   bool   `yaml:"enabled,omitempty" json:"enabled,omitempty"`
}

func (b StepBase) GetName() string     { return b.Name }
func (b StepBase) GetCondition() string { return b.Condition }
func (b StepBase) GetEnabled() bool     { return b.Enabled }

// Steps is a slice of Step with custom YAML marshal/unmarshal for polymorphism.
type Steps []Step

// UnmarshalYAML implements yaml.Unmarshaler for Steps.
func (s *Steps) UnmarshalYAML(value *yaml.Node) error {
	*s = nil
	if value.Kind != yaml.SequenceNode {
		return errors.New("steps must be a YAML sequence")
	}
	for _, item := range value.Content {
		step, err := decodeStep(item)
		if err != nil {
			return err
		}
		*s = append(*s, step)
	}
	return nil
}

// MarshalYAML implements yaml.Marshaler for Steps.
// It serializes each step to a generic map to avoid cross-package reflection issues.
func (s Steps) MarshalYAML() (interface{}, error) {
	if s == nil {
		return nil, nil
	}
	items := make([]interface{}, len(s))
	for i, step := range s {
		data, err := yaml.Marshal(step)
		if err != nil {
			return nil, fmt.Errorf("marshal step[%d]: %w", i, err)
		}
		var m map[string]interface{}
		if err := yaml.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("unmarshal step[%d] map: %w", i, err)
		}
		if m == nil {
			m = make(map[string]interface{})
		}
		m["type"] = string(step.StepType())
		items[i] = m
	}
	return items, nil
}

func decodeStep(node *yaml.Node) (Step, error) {
	if node.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("step must be a mapping node, got kind %d", node.Kind)
	}
	typeField := struct {
		Type string `yaml:"type"`
	}{}
	if err := node.Decode(&typeField); err != nil {
		return nil, fmt.Errorf("failed to decode step type discriminator: %w", err)
	}
	var step Step
	switch StepType(typeField.Type) {
	case StepTypeCommand:
		step = &CommandStep{}
	case StepTypeCheckout:
		step = &CheckoutStep{}
	case StepTypeSetupCache:
		step = &SetupCacheStep{}
	case StepTypePublishArtifact:
		step = &PublishArtifactStep{}
	case StepTypePublishReport:
		step = &PublishReportStep{}
	case StepTypeCreateBranch:
		step = &CreateBranchStep{}
	case StepTypeCreateTag:
		step = &CreateTagStep{}
	case StepTypeSetBuildVersion:
		step = &SetBuildVersionStep{}
	case StepTypeCreatePullRequest:
		step = &CreatePullRequestStep{}
	case StepTypeBuildImage:
		step = &BuildImageStep{}
	case StepTypePushImage:
		step = &PushImageStep{}
	case StepTypeRunContainer:
		step = &RunContainerStep{}
	case StepTypePullImage:
		step = &PullImageStep{}
	case StepTypeUseTemplate:
		step = &UseTemplateStep{}
	default:
		return nil, fmt.Errorf("unknown step type: %q", typeField.Type)
	}
	if err := node.Decode(step); err != nil {
		return nil, fmt.Errorf("failed to decode step of type %q: %w", typeField.Type, err)
	}
	return step, nil
}

// RegistryLogin specifies container registry credentials.
type RegistryLogin struct {
	RegistryURL    string `yaml:"registryUrl,omitempty" json:"registryUrl,omitempty"`
	UserName       string `yaml:"userName,omitempty" json:"userName,omitempty"`
	PasswordSecret string `yaml:"passwordSecret,omitempty" json:"passwordSecret,omitempty"`
}

// ---------------------------------------------------------------------------
// CommandStep
// ---------------------------------------------------------------------------

// CommandStep runs shell commands in a container (maps to CommandStep.java).
type CommandStep struct {
	StepBase       `yaml:",inline"`
	Image          string            `yaml:"image,omitempty" json:"image,omitempty"`
	Interpreter    string            `yaml:"interpreter,omitempty" json:"interpreter,omitempty"`
	RunAs          string            `yaml:"runAs,omitempty" json:"runAs,omitempty"`
	RegistryLogins []RegistryLogin   `yaml:"registryLogins,omitempty" json:"registryLogins,omitempty"`
	EnvVars        map[string]string `yaml:"envVars,omitempty" json:"envVars,omitempty"`
	UseTTY         bool              `yaml:"useTTY,omitempty" json:"useTTY,omitempty"`
	Commands       string            `yaml:"commands,omitempty" json:"commands,omitempty"`
}

func (s *CommandStep) StepType() StepType { return StepTypeCommand }

// ---------------------------------------------------------------------------
// CheckoutStep
// ---------------------------------------------------------------------------

// CheckoutStep checks out source code (maps to CheckoutStep.java).
type CheckoutStep struct {
	StepBase       `yaml:",inline"`
	WithLFS        bool `yaml:"withLfs,omitempty" json:"withLfs,omitempty"`
	WithSubmodules bool `yaml:"withSubmodules,omitempty" json:"withSubmodules,omitempty"`
	CloneDepth     int  `yaml:"cloneDepth,omitempty" json:"cloneDepth,omitempty"`
}

func (s *CheckoutStep) StepType() StepType { return StepTypeCheckout }

// ---------------------------------------------------------------------------
// SetupCacheStep
// ---------------------------------------------------------------------------

// SetupCacheStep restores/saves a cache (maps to SetupCacheStep.java).
type SetupCacheStep struct {
	StepBase      `yaml:",inline"`
	Key           string   `yaml:"key" json:"key"`
	ChecksumFiles string   `yaml:"checksumFiles,omitempty" json:"checksumFiles,omitempty"`
	Paths         []string `yaml:"paths" json:"paths"`
	UploadStrategy string  `yaml:"uploadStrategy,omitempty" json:"uploadStrategy,omitempty"`
}

func (s *SetupCacheStep) StepType() StepType { return StepTypeSetupCache }

// ---------------------------------------------------------------------------
// PublishArtifactStep
// ---------------------------------------------------------------------------

// PublishArtifactStep publishes build artifacts (maps to PublishArtifactStep.java).
type PublishArtifactStep struct {
	StepBase   `yaml:",inline"`
	SourcePath string `yaml:"sourcePath,omitempty" json:"sourcePath,omitempty"`
	Artifacts  string `yaml:"artifacts" json:"artifacts"`
	TargetPath string `yaml:"targetPath,omitempty" json:"targetPath,omitempty"`
}

func (s *PublishArtifactStep) StepType() StepType { return StepTypePublishArtifact }

// ---------------------------------------------------------------------------
// PublishReportStep
// ---------------------------------------------------------------------------

// PublishReportStep publishes a test or analysis report (maps to PublishReportStep.java).
type PublishReportStep struct {
	StepBase   `yaml:",inline"`
	ReportName string `yaml:"reportName" json:"reportName"`
	ReportType string `yaml:"reportType" json:"reportType"`
	Path       string `yaml:"path" json:"path"`
}

func (s *PublishReportStep) StepType() StepType { return StepTypePublishReport }

// Report type constants
const (
	ReportTypeJUnit   = "junit"
	ReportTypeClover  = "clover"
	ReportTypeGeneric = "generic"
)

// ---------------------------------------------------------------------------
// CreateBranchStep
// ---------------------------------------------------------------------------

// CreateBranchStep creates a branch (maps to CreateBranchStep.java).
type CreateBranchStep struct {
	StepBase      `yaml:",inline"`
	BranchName    string `yaml:"branchName" json:"branchName"`
	CommitMessage string `yaml:"commitMessage,omitempty" json:"commitMessage,omitempty"`
}

func (s *CreateBranchStep) StepType() StepType { return StepTypeCreateBranch }

// ---------------------------------------------------------------------------
// CreateTagStep
// ---------------------------------------------------------------------------

// CreateTagStep creates a tag (maps to CreateTagStep.java).
type CreateTagStep struct {
	StepBase `yaml:",inline"`
	TagName  string `yaml:"tagName" json:"tagName"`
	Message  string `yaml:"message,omitempty" json:"message,omitempty"`
}

func (s *CreateTagStep) StepType() StepType { return StepTypeCreateTag }

// ---------------------------------------------------------------------------
// SetBuildVersionStep
// ---------------------------------------------------------------------------

// SetBuildVersionStep sets the build version (maps to SetBuildVersionStep.java).
type SetBuildVersionStep struct {
	StepBase `yaml:",inline"`
	Version  string `yaml:"version" json:"version"`
}

func (s *SetBuildVersionStep) StepType() StepType { return StepTypeSetBuildVersion }

// ---------------------------------------------------------------------------
// CreatePullRequestStep
// ---------------------------------------------------------------------------

// CreatePullRequestStep creates a pull request (maps to CreatePullRequestStep.java).
type CreatePullRequestStep struct {
	StepBase     `yaml:",inline"`
	TargetBranch string `yaml:"targetBranch" json:"targetBranch"`
	PRTitle      string `yaml:"prTitle" json:"prTitle"`
	PRBody       string `yaml:"prBody,omitempty" json:"prBody,omitempty"`
}

func (s *CreatePullRequestStep) StepType() StepType { return StepTypeCreatePullRequest }

// ---------------------------------------------------------------------------
// BuildImageStep
// ---------------------------------------------------------------------------

// BuildImageStep builds a Docker image (maps to BuildImageStep.java).
type BuildImageStep struct {
	StepBase       `yaml:",inline"`
	Dockerfile     string            `yaml:"dockerfile,omitempty" json:"dockerfile,omitempty"`
	ContextPath    string            `yaml:"contextPath,omitempty" json:"contextPath,omitempty"`
	Tags           []string          `yaml:"tags,omitempty" json:"tags,omitempty"`
	RegistryLogins []RegistryLogin   `yaml:"registryLogins,omitempty" json:"registryLogins,omitempty"`
	BuildArgs      map[string]string `yaml:"buildArgs,omitempty" json:"buildArgs,omitempty"`
}

func (s *BuildImageStep) StepType() StepType { return StepTypeBuildImage }

// ---------------------------------------------------------------------------
// PushImageStep
// ---------------------------------------------------------------------------

// PushImageStep pushes a Docker image to a registry (maps to PushImageStep.java).
type PushImageStep struct {
	StepBase       `yaml:",inline"`
	ImageTags      []string          `yaml:"imageTags,omitempty" json:"imageTags,omitempty"`
	RegistryLogins []RegistryLogin   `yaml:"registryLogins,omitempty" json:"registryLogins,omitempty"`
}

func (s *PushImageStep) StepType() StepType { return StepTypePushImage }

// ---------------------------------------------------------------------------
// RunContainerStep
// ---------------------------------------------------------------------------

// RunContainerStep runs a container (maps to RunContainerStep.java).
type RunContainerStep struct {
	StepBase `yaml:",inline"`
	Image    string            `yaml:"image" json:"image"`
	Commands string            `yaml:"commands,omitempty" json:"commands,omitempty"`
	EnvVars  map[string]string `yaml:"envVars,omitempty" json:"envVars,omitempty"`
}

func (s *RunContainerStep) StepType() StepType { return StepTypeRunContainer }

// ---------------------------------------------------------------------------
// PullImageStep
// ---------------------------------------------------------------------------

// PullImageStep pulls a Docker image (maps to PullImageStep.java).
type PullImageStep struct {
	StepBase       `yaml:",inline"`
	ImageTags      []string          `yaml:"imageTags,omitempty" json:"imageTags,omitempty"`
	RegistryLogins []RegistryLogin   `yaml:"registryLogins,omitempty" json:"registryLogins,omitempty"`
}

func (s *PullImageStep) StepType() StepType { return StepTypePullImage }

// ---------------------------------------------------------------------------
// UseTemplateStep
// ---------------------------------------------------------------------------

// UseTemplateStep references a step template (maps to UseTemplateStep.java).
type UseTemplateStep struct {
	StepBase         `yaml:",inline"`
	TemplateName     string           `yaml:"templateName" json:"templateName"`
	ParamMatrix      []ParamInstances `yaml:"paramMatrix,omitempty" json:"paramMatrix,omitempty"`
	ExcludeParamMaps []ParamMap       `yaml:"excludeParamMaps,omitempty" json:"excludeParamMaps,omitempty"`
}

func (s *UseTemplateStep) StepType() StepType { return StepTypeUseTemplate }
