package buildspec

// Service defines a background service container that runs alongside a job
// (maps to Service.java in OneDev).
type Service struct {
	Name         string            `yaml:"name" json:"name"`
	Image        string            `yaml:"image" json:"image"`
	Command      string            `yaml:"command,omitempty" json:"command,omitempty"`
	EnvVars      map[string]string `yaml:"envVars,omitempty" json:"envVars,omitempty"`
	Ports        []int             `yaml:"ports,omitempty" json:"ports,omitempty"`
	ReadyCommand string            `yaml:"readyCommand,omitempty" json:"readyCommand,omitempty"`
}

// GetName returns the name of the service.
func (s *Service) GetName() string {
	return s.Name
}
