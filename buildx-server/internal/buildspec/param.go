package buildspec

import (
	"errors"
	"fmt"

	"gopkg.in/yaml.v3"
)

// ParamType identifies the type of a parameter spec.
type ParamType string

const (
	ParamTypeBoolean ParamType = "boolean"
	ParamTypeText    ParamType = "text"
	ParamTypeSecret  ParamType = "secret"
	ParamTypeInteger ParamType = "integer"
	ParamTypeFloat   ParamType = "float"
	ParamTypeDate    ParamType = "date"
	ParamTypeChoice  ParamType = "choice"
	ParamTypeCommit  ParamType = "commit"
)

// ParamSpec is the interface for all parameter specification types (maps to ParamSpec.java).
type ParamSpec interface {
	GetName() string
	GetDescription() string
	ParamType() ParamType
}

// ParamSpecBase is embedded in all concrete param spec types.
type ParamSpecBase struct {
	Name        string `yaml:"name" json:"name"`
	Description string `yaml:"description,omitempty" json:"description,omitempty"`
}

func (b ParamSpecBase) GetName() string       { return b.Name }
func (b ParamSpecBase) GetDescription() string { return b.Description }

// ParamSpecs is a slice of ParamSpec with custom YAML marshal/unmarshal for polymorphism.
type ParamSpecs []ParamSpec

// UnmarshalYAML implements yaml.Unmarshaler for ParamSpecs.
func (p *ParamSpecs) UnmarshalYAML(value *yaml.Node) error {
	*p = nil
	if value.Kind != yaml.SequenceNode {
		return errors.New("paramSpecs must be a YAML sequence")
	}
	for _, item := range value.Content {
		ps, err := decodeParamSpec(item)
		if err != nil {
			return err
		}
		*p = append(*p, ps)
	}
	return nil
}

// MarshalYAML implements yaml.Marshaler for ParamSpecs.
// Serializes each param spec to a generic map to add the type discriminator.
func (p ParamSpecs) MarshalYAML() (interface{}, error) {
	if p == nil {
		return nil, nil
	}
	items := make([]interface{}, len(p))
	for i, ps := range p {
		data, err := yaml.Marshal(ps)
		if err != nil {
			return nil, fmt.Errorf("marshal paramSpec[%d]: %w", i, err)
		}
		var m map[string]interface{}
		if err := yaml.Unmarshal(data, &m); err != nil {
			return nil, fmt.Errorf("unmarshal paramSpec[%d] map: %w", i, err)
		}
		if m == nil {
			m = make(map[string]interface{})
		}
		m["type"] = string(ps.ParamType())
		items[i] = m
	}
	return items, nil
}

func decodeParamSpec(node *yaml.Node) (ParamSpec, error) {
	if node.Kind != yaml.MappingNode {
		return nil, fmt.Errorf("paramSpec must be a mapping node, got kind %d", node.Kind)
	}
	typeField := struct {
		Type string `yaml:"type"`
	}{}
	if err := node.Decode(&typeField); err != nil {
		return nil, fmt.Errorf("failed to decode paramSpec type discriminator: %w", err)
	}
	var ps ParamSpec
	switch ParamType(typeField.Type) {
	case ParamTypeBoolean:
		ps = &BooleanParam{}
	case ParamTypeText:
		ps = &TextParam{}
	case ParamTypeSecret:
		ps = &SecretParam{}
	case ParamTypeInteger:
		ps = &IntegerParam{}
	case ParamTypeFloat:
		ps = &FloatParam{}
	case ParamTypeDate:
		ps = &DateParam{}
	case ParamTypeChoice:
		ps = &ChoiceParam{}
	case ParamTypeCommit:
		ps = &CommitParam{}
	default:
		return nil, fmt.Errorf("unknown paramSpec type: %q", typeField.Type)
	}
	if err := node.Decode(ps); err != nil {
		return nil, fmt.Errorf("failed to decode paramSpec of type %q: %w", typeField.Type, err)
	}
	return ps, nil
}

// ---------------------------------------------------------------------------
// BooleanParam
// ---------------------------------------------------------------------------

// BooleanParam is a boolean parameter (maps to BooleanParam.java).
type BooleanParam struct {
	ParamSpecBase `yaml:",inline"`
	DefaultValue  bool `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
}

func (p *BooleanParam) ParamType() ParamType { return ParamTypeBoolean }

// ---------------------------------------------------------------------------
// TextParam
// ---------------------------------------------------------------------------

// TextParam is a text string parameter (maps to TextParam.java).
type TextParam struct {
	ParamSpecBase `yaml:",inline"`
	DefaultValue  string `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
	MultiLine     bool   `yaml:"multiline,omitempty" json:"multiline,omitempty"`
	Pattern       string `yaml:"pattern,omitempty" json:"pattern,omitempty"`
}

func (p *TextParam) ParamType() ParamType { return ParamTypeText }

// ---------------------------------------------------------------------------
// SecretParam
// ---------------------------------------------------------------------------

// SecretParam is a secret/password parameter (maps to SecretParam.java).
type SecretParam struct {
	ParamSpecBase `yaml:",inline"`
}

func (p *SecretParam) ParamType() ParamType { return ParamTypeSecret }

// ---------------------------------------------------------------------------
// IntegerParam
// ---------------------------------------------------------------------------

// IntegerParam is an integer parameter (maps to IntegerParam.java).
type IntegerParam struct {
	ParamSpecBase `yaml:",inline"`
	DefaultValue  int   `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
	MinValue      *int  `yaml:"minValue,omitempty" json:"minValue,omitempty"`
	MaxValue      *int  `yaml:"maxValue,omitempty" json:"maxValue,omitempty"`
}

func (p *IntegerParam) ParamType() ParamType { return ParamTypeInteger }

// ---------------------------------------------------------------------------
// FloatParam
// ---------------------------------------------------------------------------

// FloatParam is a float parameter (maps to FloatParam.java).
type FloatParam struct {
	ParamSpecBase `yaml:",inline"`
	DefaultValue  float64  `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
	MinValue      *float64 `yaml:"minValue,omitempty" json:"minValue,omitempty"`
	MaxValue      *float64 `yaml:"maxValue,omitempty" json:"maxValue,omitempty"`
}

func (p *FloatParam) ParamType() ParamType { return ParamTypeFloat }

// ---------------------------------------------------------------------------
// DateParam
// ---------------------------------------------------------------------------

// DateParam is a date parameter (maps to DateParam.java).
type DateParam struct {
	ParamSpecBase `yaml:",inline"`
	DefaultValue  string `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
}

func (p *DateParam) ParamType() ParamType { return ParamTypeDate }

// ---------------------------------------------------------------------------
// ChoiceParam
// ---------------------------------------------------------------------------

// ChoiceParam is a choice/select parameter (maps to ChoiceParam.java).
type ChoiceParam struct {
	ParamSpecBase `yaml:",inline"`
	Choices       []string `yaml:"choices,omitempty" json:"choices,omitempty"`
	DefaultValue  string   `yaml:"defaultValue,omitempty" json:"defaultValue,omitempty"`
	AllowMultiple bool     `yaml:"allowMultiple,omitempty" json:"allowMultiple,omitempty"`
}

func (p *ChoiceParam) ParamType() ParamType { return ParamTypeChoice }

// ---------------------------------------------------------------------------
// CommitParam
// ---------------------------------------------------------------------------

// CommitParam is a commit reference parameter (maps to CommitParam.java).
type CommitParam struct {
	ParamSpecBase `yaml:",inline"`
}

func (p *CommitParam) ParamType() ParamType { return ParamTypeCommit }
