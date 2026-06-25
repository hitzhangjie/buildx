package buildspec

import (
	"fmt"
	"strings"

	"gopkg.in/yaml.v3"
)

// BuildSpecBLOBPath is the path where the build spec YAML is stored in the repository.
const BuildSpecBLOBPath = ".onedev-buildspec.yml"

// BuildSpec is the root model for .onedev-buildspec.yml (maps to BuildSpec.java in OneDev).
type BuildSpec struct {
	Jobs          []*Job          `yaml:"jobs,omitempty" json:"jobs,omitempty"`
	StepTemplates []*StepTemplate `yaml:"stepTemplates,omitempty" json:"stepTemplates,omitempty"`
	Services      []*Service      `yaml:"services,omitempty" json:"services,omitempty"`
	Properties    []*JobProperty  `yaml:"properties,omitempty" json:"properties,omitempty"`
	Imports       []*Import       `yaml:"imports,omitempty" json:"imports,omitempty"`
}

// Parse parses a YAML byte slice into a BuildSpec.
func Parse(data []byte) (*BuildSpec, error) {
	var spec BuildSpec
	if err := yaml.Unmarshal(data, &spec); err != nil {
		return nil, fmt.Errorf("buildspec: parse error: %w", err)
	}
	// Apply defaults
	for _, job := range spec.Jobs {
		job.Defaults()
	}
	return &spec, nil
}

// MustParse parses YAML data into a BuildSpec, panicking on error.
func MustParse(data []byte) *BuildSpec {
	spec, err := Parse(data)
	if err != nil {
		panic(err)
	}
	return spec
}

// Validate checks the BuildSpec for structural errors (duplicate names,
// undefined references, circular dependencies).
func (spec *BuildSpec) Validate() error {
	var errs []string

	// Collect all names
	jobNames := make(map[string]bool)
	for _, job := range spec.Jobs {
		if job.Name == "" {
			errs = append(errs, "job has empty name")
			continue
		}
		if jobNames[job.Name] {
			errs = append(errs, fmt.Sprintf("duplicate job name: %q", job.Name))
		}
		jobNames[job.Name] = true
	}

	serviceNames := make(map[string]bool)
	for _, svc := range spec.Services {
		if svc.Name == "" {
			errs = append(errs, "service has empty name")
			continue
		}
		if serviceNames[svc.Name] {
			errs = append(errs, fmt.Sprintf("duplicate service name: %q", svc.Name))
		}
		serviceNames[svc.Name] = true
	}

	templateNames := make(map[string]bool)
	for _, tmpl := range spec.StepTemplates {
		if tmpl.Name == "" {
			errs = append(errs, "step template has empty name")
			continue
		}
		if templateNames[tmpl.Name] {
			errs = append(errs, fmt.Sprintf("duplicate step template name: %q", tmpl.Name))
		}
		templateNames[tmpl.Name] = true
	}

	propertyNames := make(map[string]bool)
	for _, prop := range spec.Properties {
		if prop.Name == "" {
			errs = append(errs, "property has empty name")
			continue
		}
		if propertyNames[prop.Name] {
			errs = append(errs, fmt.Sprintf("duplicate property name: %q", prop.Name))
		}
		propertyNames[prop.Name] = true
	}

	// Get merged maps
	jobMap := spec.GetJobMap()
	serviceMap := spec.GetServiceMap()
	templateMap := spec.GetStepTemplateMap()

	// Validate each job
	for _, job := range spec.Jobs {
		// Validate required service references
		for _, requiredSvc := range job.RequiredServices {
			if _, ok := serviceMap[requiredSvc]; !ok {
				errs = append(errs, fmt.Sprintf("job %q references undefined service %q", job.Name, requiredSvc))
			}
		}

		// Validate template references
		for idx, step := range job.Steps {
			if uts, ok := step.(*UseTemplateStep); ok {
				if _, ok := templateMap[uts.TemplateName]; !ok {
					errs = append(errs, fmt.Sprintf("job %q step[%d] references undefined template %q",
						job.Name, idx, uts.TemplateName))
				}
			}
		}

		// Validate job dependency references
		for _, dep := range job.JobDependencies {
			if _, ok := jobMap[dep.JobName]; !ok {
				errs = append(errs, fmt.Sprintf("job %q depends on undefined job %q",
					job.Name, dep.JobName))
			}
		}
	}

	// Validate step template usages (check for circular references and undefined templates)
	if err := spec.validateTemplateUsages(); err != nil {
		errs = append(errs, err.Error())
	}

	// Validate DAG: check for circular job dependencies
	if err := spec.validateJobDAG(); err != nil {
		errs = append(errs, err.Error())
	}

	if len(errs) > 0 {
		return fmt.Errorf("buildspec validation failed:\n  %s", strings.Join(errs, "\n  "))
	}
	return nil
}

// validateTemplateUsages checks for circular template references and undefined templates.
func (spec *BuildSpec) validateTemplateUsages() error {
	templateMap := spec.GetStepTemplateMap()
	for _, tmpl := range spec.StepTemplates {
		if err := checkTemplateChain(tmpl.Name, tmpl.Steps, templateMap, nil); err != nil {
			return err
		}
	}
	for _, job := range spec.Jobs {
		for _, step := range job.Steps {
			if uts, ok := step.(*UseTemplateStep); ok {
				if err := checkTemplateChain(uts.TemplateName, nil, templateMap,
					[]string{uts.TemplateName}); err != nil {
					return fmt.Errorf("job %q: %w", job.Name, err)
				}
			}
		}
	}
	return nil
}

func checkTemplateChain(name string, steps Steps, templateMap map[string]*StepTemplate, visited []string) error {
	tmpl, ok := templateMap[name]
	if !ok {
		return fmt.Errorf("step template %q not found", name)
	}
	if steps == nil {
		steps = tmpl.Steps
	}
	for _, step := range steps {
		if uts, ok := step.(*UseTemplateStep); ok {
			// Check for circular reference
			for _, v := range visited {
				if v == uts.TemplateName {
					return fmt.Errorf("circular template reference detected: %s -> %s",
						strings.Join(visited, " -> "), uts.TemplateName)
				}
			}
			newVisited := append(visited, uts.TemplateName)
			if err := checkTemplateChain(uts.TemplateName, nil, templateMap, newVisited); err != nil {
				return err
			}
		}
	}
	return nil
}

// validateJobDAG checks for circular dependencies between jobs.
func (spec *BuildSpec) validateJobDAG() error {
	jobMap := spec.GetJobMap()
	for _, job := range spec.Jobs {
		if err := checkDAG(job.Name, job, jobMap, nil); err != nil {
			return err
		}
	}
	return nil
}

func checkDAG(name string, job *Job, jobMap map[string]*Job, visited []string) error {
	for _, dep := range job.JobDependencies {
		// Check for circular reference
		for _, v := range visited {
			if v == dep.JobName {
				return fmt.Errorf("circular job dependency detected: %s -> %s",
					strings.Join(visited, " -> "), dep.JobName)
			}
		}
		depJob, ok := jobMap[dep.JobName]
		if !ok {
			return fmt.Errorf("dependency job %q not found", dep.JobName)
		}
		newVisited := append(visited, dep.JobName)
		if err := checkDAG(dep.JobName, depJob, jobMap, newVisited); err != nil {
			return err
		}
	}
	return nil
}

// GetJobMap returns a merged map of all job names to jobs, including imported build specs.
func (spec *BuildSpec) GetJobMap() map[string]*Job {
	m := make(map[string]*Job)
	// Imported specs come first, then local specs override
	for _, imp := range spec.Imports {
		_ = imp // import resolution is done externally; for current scope just use local
	}
	for _, job := range spec.Jobs {
		if job != nil && job.Name != "" {
			m[job.Name] = job
		}
	}
	return m
}

// GetServiceMap returns a map of all service names to services.
func (spec *BuildSpec) GetServiceMap() map[string]*Service {
	m := make(map[string]*Service)
	for _, svc := range spec.Services {
		if svc != nil && svc.Name != "" {
			m[svc.Name] = svc
		}
	}
	return m
}

// GetStepTemplateMap returns a map of all step template names to templates.
func (spec *BuildSpec) GetStepTemplateMap() map[string]*StepTemplate {
	m := make(map[string]*StepTemplate)
	for _, tmpl := range spec.StepTemplates {
		if tmpl != nil && tmpl.Name != "" {
			m[tmpl.Name] = tmpl
		}
	}
	return m
}

// GetPropertyMap returns a map of all property names to properties.
func (spec *BuildSpec) GetPropertyMap() map[string]*JobProperty {
	m := make(map[string]*JobProperty)
	for _, prop := range spec.Properties {
		if prop != nil && prop.Name != "" {
			m[prop.Name] = prop
		}
	}
	return m
}
