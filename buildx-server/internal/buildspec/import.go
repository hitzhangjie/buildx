package buildspec

// Import references an external build spec from another project or tag
// (maps to Import.java in OneDev).
type Import struct {
	ProjectPath string `yaml:"projectPath" json:"projectPath"`
	Tag         string `yaml:"tag,omitempty" json:"tag,omitempty"`
}
