package execplan

import "fmt"

// NewCommandsPlan builds a minimal plan from flat command strings (legacy API).
func NewCommandsPlan(commands []string) *Plan {
	actions := make([]Action, 0, len(commands))
	for i, cmd := range commands {
		actions = append(actions, Action{
			Name:      fmt.Sprintf("step-%d", i+1),
			Facade:    &CommandFacade{Name: fmt.Sprintf("step-%d", i+1), Commands: cmd},
			Condition: ExecuteConditionAlways,
		})
	}
	return &Plan{Root: &CompositeFacade{Actions: actions}}
}
