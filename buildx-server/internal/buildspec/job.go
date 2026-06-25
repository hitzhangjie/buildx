package buildspec

// Job defines a single CI/CD job (maps to Job.java in OneDev).
type Job struct {
	Name               string              `yaml:"name" json:"name"`
	JobExecutor        string              `yaml:"jobExecutor,omitempty" json:"jobExecutor,omitempty"`
	Steps              Steps               `yaml:"steps,omitempty" json:"steps,omitempty"`
	ParamSpecs         ParamSpecs          `yaml:"paramSpecs,omitempty" json:"paramSpecs,omitempty"`
	JobDependencies    []*JobDependency    `yaml:"jobDependencies,omitempty" json:"jobDependencies,omitempty"`
	ProjectDependencies []*ProjectDependency `yaml:"projectDependencies,omitempty" json:"projectDependencies,omitempty"`
	RequiredServices   []string            `yaml:"requiredServices,omitempty" json:"requiredServices,omitempty"`
	Triggers           Triggers            `yaml:"triggers,omitempty" json:"triggers,omitempty"`
	Timeout            int64               `yaml:"timeout,omitempty" json:"timeout,omitempty"`
	PostBuildActions   PostBuildActions    `yaml:"postBuildActions,omitempty" json:"postBuildActions,omitempty"`
	SequentialGroup    string              `yaml:"sequentialGroup,omitempty" json:"sequentialGroup,omitempty"`
	RetryCondition     string              `yaml:"retryCondition,omitempty" json:"retryCondition,omitempty"`
	MaxRetries         int                 `yaml:"maxRetries,omitempty" json:"maxRetries,omitempty"`
	RetryDelay         int                 `yaml:"retryDelay,omitempty" json:"retryDelay,omitempty"`
}

// EnvVar is a key-value environment variable.
type EnvVar struct {
	Name  string `yaml:"name" json:"name"`
	Value string `yaml:"value" json:"value"`
}

// ParamInstances is a named parameter with a list of values (used in paramMatrix).
type ParamInstances struct {
	Name   string   `yaml:"name" json:"name"`
	Values []string `yaml:"values,omitempty" json:"values,omitempty"`
}

// ParamMap is a parameter value map used for exclude param combos.
type ParamMap struct {
	Params map[string]string `yaml:"params,omitempty" json:"params,omitempty"`
}

// Default values
const (
	DefaultTimeout         int64  = 14400
	DefaultMaxRetries            = 3
	DefaultRetryDelay            = 30
	DefaultRetryCondition        = "never"
)

// Defaults sets default values on the Job for fields that were left at their zero value.
func (j *Job) Defaults() {
	if j.Timeout == 0 {
		j.Timeout = DefaultTimeout
	}
	if j.MaxRetries == 0 {
		j.MaxRetries = DefaultMaxRetries
	}
	if j.RetryDelay == 0 {
		j.RetryDelay = DefaultRetryDelay
	}
	if j.RetryCondition == "" {
		j.RetryCondition = DefaultRetryCondition
	}
}
