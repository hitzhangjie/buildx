package execplan

import (
	"context"
	"fmt"
)

// LeafResult is returned by executing one leaf action.
type LeafResult struct {
	StepResultName string
	Success        bool
	ExitCode       int
	DurationMs     int64
	Error          string
	Skipped        bool
}

// LeafRunner executes a single leaf facade. position identifies the action path
// within the plan (mirrors OneDev's List<Integer> stepPosition).
type LeafRunner func(ctx context.Context, action Action, facade LeafFacade, position []int) (LeafResult, error)

// Run traverses the plan in order, honoring execute conditions and optional steps.
func (p *Plan) Run(ctx context.Context, run LeafRunner) ([]LeafResult, error) {
	if p == nil || p.Root == nil {
		return nil, nil
	}
	var results []LeafResult
	priorSuccessful := true
	err := traverseComposite(ctx, p.Root, nil, run, &priorSuccessful, &results)
	return results, err
}

func traverseComposite(
	ctx context.Context,
	composite *CompositeFacade,
	prefix []int,
	run LeafRunner,
	priorSuccessful *bool,
	results *[]LeafResult,
) error {
	for i, action := range composite.Actions {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		position := append(append([]int(nil), prefix...), i)

		if facade, ok := action.Facade.(*CompositeFacade); ok {
			if err := traverseComposite(ctx, facade, position, run, priorSuccessful, results); err != nil {
				return err
			}
			continue
		}

		if !action.Condition.ShouldRun(*priorSuccessful) {
			*results = append(*results, LeafResult{
				StepResultName: action.Name,
				Success:        true,
				Skipped:        true,
			})
			continue
		}

		leaf, ok := action.Facade.(LeafFacade)
		if !ok {
			return fmt.Errorf("execplan: action %q has non-leaf facade %T", action.Name, action.Facade)
		}

		result, err := run(ctx, action, leaf, position)
		if err != nil {
			return err
		}
		if result.StepResultName == "" {
			result.StepResultName = action.Name
		}
		*results = append(*results, result)

		if !result.Skipped {
			if result.Success {
				// prior success unchanged
			} else if action.Optional {
				// optional failure does not affect subsequent SUCCESSFUL condition
			} else {
				*priorSuccessful = false
				return nil
			}
		}
	}
	return nil
}
