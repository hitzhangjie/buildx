package buildspec

// StepTemplate is a reusable set of steps that can be referenced by UseTemplateStep
// (maps to StepTemplate.java in OneDev).
type StepTemplate struct {
	Name       string     `yaml:"name" json:"name"`
	Steps      Steps      `yaml:"steps,omitempty" json:"steps,omitempty"`
	ParamSpecs ParamSpecs `yaml:"paramSpecs,omitempty" json:"paramSpecs,omitempty"`
}

// GetName returns the name of the step template.
func (t *StepTemplate) GetName() string {
	return t.Name
}
