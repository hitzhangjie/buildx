package buildspec

import (
	"errors"
	"fmt"

	"gopkg.in/yaml.v3"
)

// TriggerType identifies the type of a job trigger.
type TriggerType string

const (
	TriggerTypeBranchUpdate       TriggerType = "branch-update"
	TriggerTypeTagCreate          TriggerType = "tag-create"
	TriggerTypePullRequest        TriggerType = "pull-request"
	TriggerTypePullRequestUpdate  TriggerType = "pull-request-update"
	TriggerTypePullRequestMerge   TriggerType = "pull-request-merge"
	TriggerTypePullRequestDiscard TriggerType = "pull-request-discard"
	TriggerTypeSchedule           TriggerType = "schedule"
	TriggerTypeDependencyFinished TriggerType = "dependency-finished"
)

// JobTrigger is the interface for all job trigger types (maps to JobTrigger.java in OneDev).
type JobTrigger interface {
	GetProjects() string
	GetParamMatrix() []ParamInstances
	GetExcludeParamMaps() []ParamMap
	TriggerType() TriggerType
}

// TriggerBase is embedded in all concrete trigger types to provide common fields.
type TriggerBase struct {
	Projects         string           `yaml:"projects,omitempty" json:"projects,omitempty"`
	ParamMatrix      []ParamInstances `yaml:"paramMatrix,omitempty" json:"paramMatrix,omitempty"`
	ExcludeParamMaps []ParamMap       `yaml:"excludeParamMaps,omitempty" json:"excludeParamMaps,omitempty"`
}

func (b TriggerBase) GetProjects() string            { return b.Projects }
func (b TriggerBase) GetParamMatrix() []ParamInstances { return b.ParamMatrix }
func (b TriggerBase) GetExcludeParamMaps() []ParamMap  { return b.ExcludeParamMaps }

// Triggers is a slice of JobTrigger with custom YAML marshal/unmarshal for polymorphism.
type Triggers []JobTrigger

// UnmarshalYAML implements yaml.Unmarshaler for Triggers.
func (t *Triggers) UnmarshalYAML(value *yaml.Node) error {
	*t = nil
	if value.Kind != yaml.SequenceNode {
		return errors.New("triggers must be a YAML sequence")
	}
	for _, item := range value.Content {
		trigger, err := decodeTrigger(item)
		if err != nil {
			return err
		}
		*t = append(*t, trigger)
	}
	return nil
}

// MarshalYAML implements yaml.Marshaler for Triggers.
// Serializes each trigger to a generic map to add the type discriminator.
func (t Triggers) MarshalYAML() (interface{}, error) {
	if t == nil {
		return nil, nil
	}
	items := make([]interface{}, len(t))
	for i, trigger := range t {
		data, err := yaml.Marshal(trigger)
		if err != nil {
			return nil, fmt.Errorf("marshal trigger[%d]: %w", i, err)
		}
		var m map[string]interface{}
		if err := yaml.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("unmarshal trigger[%d] map: %w", i, err)
		}
		if m == nil {
			m = make(map[string]interface{})
		}
		m["type"] = string(trigger.TriggerType())
		items[i] = m
	}
	return items, nil
}

func decodeTrigger(node *yaml.Node) (JobTrigger, error) {
	if node.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("trigger must be a mapping node, got kind %d", node.Kind)
	}
	typeField := struct {
		Type string `yaml:"type"`
	}{}
	if err := node.Decode(&typeField); err != nil {
		return nil, fmt.Errorf("failed to decode trigger type discriminator: %w", err)
	}
	var trigger JobTrigger
	switch TriggerType(typeField.Type) {
	case TriggerTypeBranchUpdate:
		trigger = &BranchUpdateTrigger{}
	case TriggerTypeTagCreate:
		trigger = &TagCreateTrigger{}
	case TriggerTypePullRequest:
		trigger = &PullRequestTrigger{}
	case TriggerTypePullRequestUpdate:
		trigger = &PullRequestUpdateTrigger{}
	case TriggerTypePullRequestMerge:
		trigger = &PullRequestMergeTrigger{}
	case TriggerTypePullRequestDiscard:
		trigger = &PullRequestDiscardTrigger{}
	case TriggerTypeSchedule:
		trigger = &ScheduleTrigger{}
	case TriggerTypeDependencyFinished:
		trigger = &DependencyFinishedTrigger{}
	default:
		return nil, fmt.Errorf("unknown trigger type: %q", typeField.Type)
	}
	if err := node.Decode(trigger); err != nil {
		return nil, fmt.Errorf("failed to decode trigger of type %q: %w", typeField.Type, err)
	}
	return trigger, nil
}

// ---------------------------------------------------------------------------
// BranchUpdateTrigger
// ---------------------------------------------------------------------------

// BranchUpdateTrigger triggers on branch updates (maps to BranchUpdateTrigger.java).
type BranchUpdateTrigger struct {
	TriggerBase `yaml:",inline"`
	Branches    string `yaml:"branches,omitempty" json:"branches,omitempty"`
	Paths       string `yaml:"paths,omitempty" json:"paths,omitempty"`
}

func (t *BranchUpdateTrigger) TriggerType() TriggerType { return TriggerTypeBranchUpdate }

// ---------------------------------------------------------------------------
// TagCreateTrigger
// ---------------------------------------------------------------------------

// TagCreateTrigger triggers on tag creation (maps to TagCreateTrigger.java).
type TagCreateTrigger struct {
	TriggerBase `yaml:",inline"`
	Tags        string `yaml:"tags,omitempty" json:"tags,omitempty"`
}

func (t *TagCreateTrigger) TriggerType() TriggerType { return TriggerTypeTagCreate }

// ---------------------------------------------------------------------------
// PullRequestTrigger (base for PR triggers)
// ---------------------------------------------------------------------------

// PullRequestTrigger triggers on pull request events (maps to PullRequestTrigger.java).
type PullRequestTrigger struct {
	TriggerBase `yaml:",inline"`
	Branches    string `yaml:"branches,omitempty" json:"branches,omitempty"`
	Paths       string `yaml:"paths,omitempty" json:"paths,omitempty"`
}

func (t *PullRequestTrigger) TriggerType() TriggerType { return TriggerTypePullRequest }

// ---------------------------------------------------------------------------
// PullRequestUpdateTrigger
// ---------------------------------------------------------------------------

// PullRequestUpdateTrigger triggers on PR updates (maps to PullRequestUpdateTrigger.java).
type PullRequestUpdateTrigger struct {
	TriggerBase `yaml:",inline"`
	Branches    string `yaml:"branches,omitempty" json:"branches,omitempty"`
	Paths       string `yaml:"paths,omitempty" json:"paths,omitempty"`
}

func (t *PullRequestUpdateTrigger) TriggerType() TriggerType { return TriggerTypePullRequestUpdate }

// ---------------------------------------------------------------------------
// PullRequestMergeTrigger
// ---------------------------------------------------------------------------

// PullRequestMergeTrigger triggers on PR merge (maps to PullRequestMergeTrigger.java).
type PullRequestMergeTrigger struct {
	TriggerBase `yaml:",inline"`
	Branches    string `yaml:"branches,omitempty" json:"branches,omitempty"`
	Paths       string `yaml:"paths,omitempty" json:"paths,omitempty"`
}

func (t *PullRequestMergeTrigger) TriggerType() TriggerType { return TriggerTypePullRequestMerge }

// ---------------------------------------------------------------------------
// PullRequestDiscardTrigger
// ---------------------------------------------------------------------------

// PullRequestDiscardTrigger triggers on PR discard (maps to PullRequestDiscardTrigger.java).
type PullRequestDiscardTrigger struct {
	TriggerBase `yaml:",inline"`
	Branches    string `yaml:"branches,omitempty" json:"branches,omitempty"`
	Paths       string `yaml:"paths,omitempty" json:"paths,omitempty"`
}

func (t *PullRequestDiscardTrigger) TriggerType() TriggerType { return TriggerTypePullRequestDiscard }

// ---------------------------------------------------------------------------
// ScheduleTrigger
// ---------------------------------------------------------------------------

// ScheduleTrigger triggers on a cron schedule (maps to ScheduleTrigger.java).
type ScheduleTrigger struct {
	TriggerBase    `yaml:",inline"`
	CronExpression string `yaml:"cronExpression" json:"cronExpression"`
}

func (t *ScheduleTrigger) TriggerType() TriggerType { return TriggerTypeSchedule }

// ---------------------------------------------------------------------------
// DependencyFinishedTrigger
// ---------------------------------------------------------------------------

// DependencyFinishedTrigger triggers when a dependency job finishes (maps to DependencyFinishedTrigger.java).
type DependencyFinishedTrigger struct {
	TriggerBase `yaml:",inline"`
	JobNames    []string `yaml:"jobNames,omitempty" json:"jobNames,omitempty"`
}

func (t *DependencyFinishedTrigger) TriggerType() TriggerType { return TriggerTypeDependencyFinished }
