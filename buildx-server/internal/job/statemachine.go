package job

import (
	"fmt"

	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
)

// BuildStateMachine manages build lifecycle state transitions.
//
// State diagram:
//
//	WAITING ──► PENDING ──► RUNNING ──► SUCCESSFUL
//	                              │          FAILED
//	                              │          CANCELLED
//	                              │          TIMED_OUT
//	                              │
//	                              ├──► PAUSED ──► RUNNING
//	                              │              CANCELLED
//	                              │
//	                              └──► CANCELLED (from PENDING also possible)
//
// Maps to OneDev's state management in Build.java (getStatus() transitions).
type BuildStateMachine struct {
	build *model.Build
}

// NewBuildStateMachine creates a state machine for a build.
func NewBuildStateMachine(build *model.Build) *BuildStateMachine {
	return &BuildStateMachine{build: build}
}

// validTransitions defines the allowed state transitions.
var validTransitions = map[model.BuildStatus][]model.BuildStatus{
	model.BuildStatusWaiting:    {model.BuildStatusPending, model.BuildStatusCancelled},
	model.BuildStatusPending:    {model.BuildStatusRunning, model.BuildStatusCancelled},
	model.BuildStatusRunning:    {model.BuildStatusSuccessful, model.BuildStatusFailed, model.BuildStatusCancelled, model.BuildStatusTimedOut},
}

// Transition validates and executes a state transition.
// Returns ErrInvalidTransition if the transition is not allowed.
func (sm *BuildStateMachine) Transition(to model.BuildStatus) error {
	if sm.build == nil {
		return fmt.Errorf("build is nil")
	}

	if sm.build.Status == to {
		return nil // already in target state
	}

	if !sm.CanTransition(to) {
		return fmt.Errorf("%w: %s -> %s", ErrInvalidTransition, sm.build.Status, to)
	}

	sm.build.Status = to
	return nil
}

// IsTerminal returns true if the build is in a terminal state
// (SUCCESSFUL, FAILED, CANCELLED, TIMED_OUT).
func (sm *BuildStateMachine) IsTerminal() bool {
	if sm.build == nil {
		return false
	}
	switch sm.build.Status {
	case model.BuildStatusSuccessful,
		model.BuildStatusFailed,
		model.BuildStatusCancelled,
		model.BuildStatusTimedOut:
		return true
	}
	return false
}

// IsRunning returns true if the build is currently executing.
func (sm *BuildStateMachine) IsRunning() bool {
	if sm.build == nil {
		return false
	}
	return sm.build.Status == model.BuildStatusRunning
}

// IsPaused returns true if the build is paused.
func (sm *BuildStateMachine) IsPaused() bool {
	if sm.build == nil {
		return false
	}
	return sm.build.Paused && sm.build.Status == model.BuildStatusRunning
}

// CanTransition checks if transitioning from the current state to the target
// state is allowed by the state machine rules.
func (sm *BuildStateMachine) CanTransition(to model.BuildStatus) bool {
	if sm.build == nil {
		return false
	}
	allowed, ok := validTransitions[sm.build.Status]
	if !ok {
		return false
	}
	for _, s := range allowed {
		if s == to {
			return true
		}
	}
	return false
}
