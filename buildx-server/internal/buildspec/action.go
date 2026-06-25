package buildspec

import (
	"errors"
	"fmt"

	"gopkg.in/yaml.v3"
)

// ActionType identifies the type of a post-build action.
type ActionType string

const (
	ActionTypeCreateIssue      ActionType = "create-issue"
	ActionTypeRunJob           ActionType = "run-job"
	ActionTypeSendNotification ActionType = "send-notification"
)

// PostBuildAction is the interface for post-build action types (maps to PostBuildAction.java).
type PostBuildAction interface {
	GetCondition() string
	ActionType() ActionType
}

// ActionBase is embedded in all concrete action types.
type ActionBase struct {
	Condition string `yaml:"condition,omitempty" json:"condition,omitempty"`
}

func (a ActionBase) GetCondition() string { return a.Condition }

// PostBuildActions is a slice of PostBuildAction with custom YAML marshal/unmarshal for polymorphism.
type PostBuildActions []PostBuildAction

// UnmarshalYAML implements yaml.Unmarshaler for PostBuildActions.
func (a *PostBuildActions) UnmarshalYAML(value *yaml.Node) error {
	*a = nil
	if value.Kind != yaml.SequenceNode {
		return errors.New("postBuildActions must be a YAML sequence")
	}
	for _, item := range value.Content {
		action, err := decodeAction(item)
		if err != nil {
			return err
		}
		*a = append(*a, action)
	}
	return nil
}

// MarshalYAML implements yaml.Marshaler for PostBuildActions.
// Serializes each action to a generic map to add the type discriminator.
func (a PostBuildActions) MarshalYAML() (interface{}, error) {
	if a == nil {
		return nil, nil
	}
	items := make([]interface{}, len(a))
	for i, action := range a {
		data, err := yaml.Marshal(action)
		if err != nil {
			return nil, fmt.Errorf("marshal action[%d]: %w", i, err)
		}
		var m map[string]interface{}
		if err := yaml.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("unmarshal action[%d] map: %w", i, err)
		}
		if m == nil {
			m = make(map[string]interface{})
		}
		m["type"] = string(action.ActionType())
		items[i] = m
	}
	return items, nil
}

func decodeAction(node *yaml.Node) (PostBuildAction, error) {
	if node.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("postBuildAction must be a mapping node, got kind %d", node.Kind)
	}
	typeField := struct {
		Type string `yaml:"type"`
	}{}
	if err := node.Decode(&typeField); err != nil {
		return nil, fmt.Errorf("failed to decode action type discriminator: %w", err)
	}
	var action PostBuildAction
	switch ActionType(typeField.Type) {
	case ActionTypeCreateIssue:
		action = &CreateIssueAction{}
	case ActionTypeRunJob:
		action = &RunJobAction{}
	case ActionTypeSendNotification:
		action = &SendNotificationAction{}
	default:
		return nil, fmt.Errorf("unknown action type: %q", typeField.Type)
	}
	if err := node.Decode(action); err != nil {
		return nil, fmt.Errorf("failed to decode action of type %q: %w", typeField.Type, err)
	}
	return action, nil
}

// ---------------------------------------------------------------------------
// CreateIssueAction
// ---------------------------------------------------------------------------

// CreateIssueAction creates an issue after a build (maps to CreateIssueAction.java).
type CreateIssueAction struct {
	ActionBase    `yaml:",inline"`
	TitleTemplate string `yaml:"titleTemplate,omitempty" json:"titleTemplate,omitempty"`
	BodyTemplate  string `yaml:"bodyTemplate,omitempty" json:"bodyTemplate,omitempty"`
	AssigneeName  string `yaml:"assigneeName,omitempty" json:"assigneeName,omitempty"`
	MilestoneName string `yaml:"milestoneName,omitempty" json:"milestoneName,omitempty"`
}

func (a *CreateIssueAction) ActionType() ActionType { return ActionTypeCreateIssue }

// ---------------------------------------------------------------------------
// RunJobAction
// ---------------------------------------------------------------------------

// RunJobAction triggers another job after a build (maps to RunJobAction.java).
type RunJobAction struct {
	ActionBase  `yaml:",inline"`
	JobName     string           `yaml:"jobName,omitempty" json:"jobName,omitempty"`
	ParamMatrix []ParamInstances `yaml:"paramMatrix,omitempty" json:"paramMatrix,omitempty"`
}

func (a *RunJobAction) ActionType() ActionType { return ActionTypeRunJob }

// ---------------------------------------------------------------------------
// SendNotificationAction
// ---------------------------------------------------------------------------

// SendNotificationAction sends a notification after a build (maps to SendNotificationAction.java).
type SendNotificationAction struct {
	ActionBase `yaml:",inline"`
	Receivers  []string `yaml:"receivers,omitempty" json:"receivers,omitempty"`
	Template   string   `yaml:"template,omitempty" json:"template,omitempty"`
}

func (a *SendNotificationAction) ActionType() ActionType { return ActionTypeSendNotification }
