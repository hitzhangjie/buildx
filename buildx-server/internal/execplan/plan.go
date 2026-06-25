// Package execplan compiles buildspec steps into an executable Action plan and
// traverses the plan during job execution. It maps to OneDev's k8shelper Action /
// CompositeFacade / LeafFacade IR used by DefaultJobService.execute and
// JobExecutor implementations.
package execplan

import (
	"strings"
)

// ExecuteCondition controls when a step runs relative to prior step outcomes.
// Maps to io.onedev.k8shelper.ExecuteCondition.
type ExecuteCondition string

const (
	ExecuteConditionAlways     ExecuteCondition = "ALWAYS"
	ExecuteConditionSuccessful ExecuteCondition = "SUCCESSFUL"
)

// ParseExecuteCondition normalizes a buildspec step condition string.
func ParseExecuteCondition(raw string) ExecuteCondition {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "", "SUCCESSFUL", "SUCCESS":
		return ExecuteConditionSuccessful
	case "ALWAYS":
		return ExecuteConditionAlways
	default:
		return ExecuteCondition(raw)
	}
}

// ShouldRun reports whether an action should execute given prior step success.
func (c ExecuteCondition) ShouldRun(priorSuccessful bool) bool {
	switch c {
	case ExecuteConditionAlways:
		return true
	case ExecuteConditionSuccessful:
		return priorSuccessful
	default:
		return priorSuccessful
	}
}

// Facade is the executable payload of an Action (StepFacade in OneDev).
type Facade interface {
	isFacade()
}

// LeafFacade is a single executable unit (CommandFacade, CheckoutFacade, etc.).
type LeafFacade interface {
	Facade
	isLeafFacade()
}

// CompositeFacade groups child actions (UseTemplateStep expansion, job root).
type CompositeFacade struct {
	Actions []Action
}

func (*CompositeFacade) isFacade() {}

// Action wraps a facade with execution metadata (maps to k8shelper.Action).
type Action struct {
	Name      string
	Facade    Facade
	Condition ExecuteCondition
	Optional  bool
}

// Plan is the compiled execution tree for one job run.
type Plan struct {
	Root *CompositeFacade
}

// CommandEntries returns flattened shell commands from a plan (for remote-shell delegation).
func (p *Plan) CommandEntries() []CommandFacade {
	if p == nil || p.Root == nil {
		return nil
	}
	var commands []CommandFacade
	collectCommands(p.Root, &commands)
	return commands
}

func collectCommands(composite *CompositeFacade, out *[]CommandFacade) {
	for _, action := range composite.Actions {
		switch facade := action.Facade.(type) {
		case *CompositeFacade:
			collectCommands(facade, out)
		case *CommandFacade:
			*out = append(*out, *facade)
		}
	}
}
