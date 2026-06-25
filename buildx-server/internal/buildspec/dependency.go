package buildspec

// JobDependency specifies a dependency on another job in the same build spec
// (maps to JobDependency.java in OneDev).
type JobDependency struct {
	JobName           string            `yaml:"jobName" json:"jobName"`
	RequireSuccessful bool              `yaml:"requireSuccessful" json:"requireSuccessful"`
	ParamMatrix       []ParamInstances  `yaml:"paramMatrix,omitempty" json:"paramMatrix,omitempty"`
	ExcludeParamMaps  []ParamMap        `yaml:"excludeParamMaps,omitempty" json:"excludeParamMaps,omitempty"`
	Artifacts         string            `yaml:"artifacts,omitempty" json:"artifacts,omitempty"`
	DestinationPath   string            `yaml:"destinationPath,omitempty" json:"destinationPath,omitempty"`
}

// ProjectDependency specifies a dependency on a build from another project
// (maps to ProjectDependency.java in OneDev).
type ProjectDependency struct {
	ProjectPath   string        `yaml:"projectPath" json:"projectPath"`
	BuildProvider BuildProvider `yaml:"buildProvider" json:"buildProvider"`
	Artifacts     string        `yaml:"artifacts,omitempty" json:"artifacts,omitempty"`
	DestinationPath string      `yaml:"destinationPath,omitempty" json:"destinationPath,omitempty"`
}

// BuildProvider specifies how to find the build from the dependent project
// (maps to BuildProvider.java interface with LastFinishedBuild and SpecifiedBuild implementations).
type BuildProvider struct {
	Type        string `yaml:"type" json:"type"`
	BuildNumber int    `yaml:"buildNumber,omitempty" json:"buildNumber,omitempty"`
}

// BuildProvider type constants
const (
	BuildProviderLastFinished = "last-finished"
	BuildProviderSpecified    = "specified"
)
