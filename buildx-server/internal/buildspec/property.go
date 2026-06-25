package buildspec

// JobProperty is a key-value property attached to the build spec (maps to JobProperty.java in OneDev).
type JobProperty struct {
	Name  string `yaml:"name" json:"name"`
	Value string `yaml:"value" json:"value"`
}

// GetName returns the name of the property.
func (p *JobProperty) GetName() string {
	return p.Name
}
