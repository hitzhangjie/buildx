package job

import (
	"fmt"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/buildspec"
)

// ---------------------------------------------------------------------------
// DAG types
// ---------------------------------------------------------------------------

// DAGNodeStatus represents the execution status of a job in the DAG.
type DAGNodeStatus string

const (
	DAGPending DAGNodeStatus = "PENDING"
	DAGReady   DAGNodeStatus = "READY"
	DAGRunning DAGNodeStatus = "RUNNING"
	DAGDone    DAGNodeStatus = "DONE"
	DAGFailed  DAGNodeStatus = "FAILED"
)

// DAGNode represents a single job in the dependency graph.
type DAGNode struct {
	Job          *buildspec.Job
	Dependencies []string      // job names this node depends on
	Dependents   []string      // job names that depend on this node
	Status       DAGNodeStatus
}

// JobDAG represents the dependency graph of jobs in a pipeline.
// It maps to OneDev's implicit DAG resolution from JobDependency entries.
type JobDAG struct {
	Jobs map[string]*DAGNode // jobName -> node
}

// BuildDAG creates a DAG from BuildSpec jobs, resolving all dependencies.
// Jobs with no dependencies start as READY; others start as PENDING.
func BuildDAG(spec *buildspec.BuildSpec) *JobDAG {
	dag := &JobDAG{
		Jobs: make(map[string]*DAGNode),
	}

	if spec == nil {
		return dag
	}

	// Create nodes for each job
	for _, job := range spec.Jobs {
		node := &DAGNode{
			Job:          job,
			Dependencies: make([]string, 0),
			Dependents:   make([]string, 0),
		}

		// Record explicit job dependencies from JobDependency entries
		for _, dep := range job.JobDependencies {
			if dep.JobName != "" {
				node.Dependencies = append(node.Dependencies, dep.JobName)
			}
		}

		// Initial status: READY if no dependencies, PENDING otherwise
		if len(node.Dependencies) == 0 {
			node.Status = DAGReady
		} else {
			node.Status = DAGPending
		}

		dag.Jobs[job.Name] = node
	}

	// Resolve dependents (reverse edges)
	for name, node := range dag.Jobs {
		for _, depName := range node.Dependencies {
			depNode, ok := dag.Jobs[depName]
			if !ok {
				// Dependency on a job not in this spec; this will be resolved
				// at runtime by waiting for the external build. For DAG purposes,
				// mark as ready since we can't enforce it locally.
				node.Status = DAGReady
				continue
			}
			depNode.Dependents = append(depNode.Dependents, name)
		}
		// Trim duplicates in Dependencies if any
		node.Dependencies = uniqueStrings(node.Dependencies)
	}

	return dag
}

// ResolveReady returns job names that are ready to run (all dependencies satisfied).
func (d *JobDAG) ResolveReady() []string {
	if d == nil {
		return nil
	}
	var ready []string
	for name, node := range d.Jobs {
		if node.Status == DAGReady {
			ready = append(ready, name)
		}
	}
	return ready
}

// MarkDone marks a job as done and returns newly ready jobs.
// If success is false, all dependents are also marked as Failed.
func (d *JobDAG) MarkDone(jobName string, success bool) []string {
	if d == nil {
		return nil
	}

	node, ok := d.Jobs[jobName]
	if !ok {
		return nil
	}

	if success {
		node.Status = DAGDone
	} else {
		node.Status = DAGFailed
		// Mark all dependents as failed too
		for _, depName := range node.Dependents {
			if depNode, ok := d.Jobs[depName]; ok {
				depNode.Status = DAGFailed
			}
		}
		return nil // dependents were failed, not readied
	}

	// Check which dependents are now ready
	var newlyReady []string
	for _, depName := range node.Dependents {
		depNode, ok := d.Jobs[depName]
		if !ok || depNode.Status != DAGPending {
			continue
		}
		// Check if all dependencies of this dependent are done
		allDone := true
		for _, depName := range depNode.Dependencies {
			if dn, ok := d.Jobs[depName]; ok && dn.Status != DAGDone {
				allDone = false
				break
			}
		}
		if allDone {
			depNode.Status = DAGReady
			newlyReady = append(newlyReady, depName)
		}
	}

	return newlyReady
}

// MarkRunning marks a job as currently executing.
func (d *JobDAG) MarkRunning(jobName string) error {
	if d == nil {
		return fmt.Errorf("dag is nil")
	}
	node, ok := d.Jobs[jobName]
	if !ok {
		return fmt.Errorf("%w: job %q not found in DAG", ErrJobNotFound, jobName)
	}
	if node.Status != DAGReady {
		return fmt.Errorf("%w: job %q is not ready (status: %s)", ErrInvalidTransition, jobName, node.Status)
	}
	node.Status = DAGRunning
	return nil
}

// AllDone returns true when all jobs in the DAG are finished (Done or Failed).
func (d *JobDAG) AllDone() bool {
	if d == nil {
		return true
	}
	for _, node := range d.Jobs {
		if node.Status != DAGDone && node.Status != DAGFailed {
			return false
		}
	}
	return true
}

// HasFailures returns job names that failed.
func (d *JobDAG) HasFailures() []string {
	if d == nil {
		return nil
	}
	var failed []string
	for name, node := range d.Jobs {
		if node.Status == DAGFailed {
			failed = append(failed, name)
		}
	}
	return failed
}

// StatusCount returns the count of nodes in each status.
func (d *JobDAG) StatusCount() map[DAGNodeStatus]int {
	counts := make(map[DAGNodeStatus]int)
	if d == nil {
		return counts
	}
	for _, node := range d.Jobs {
		counts[node.Status]++
	}
	return counts
}

// String returns a human-readable summary of the DAG state.
func (d *JobDAG) String() string {
	if d == nil || len(d.Jobs) == 0 {
		return "JobDAG{empty}"
	}
	var parts []string
	for name, node := range d.Jobs {
		deps := strings.Join(node.Dependencies, ",")
		depsStr := deps
		if depsStr == "" {
			depsStr = "none"
		}
		parts = append(parts, fmt.Sprintf("%s[%s](%s)", name, node.Status, depsStr))
	}
	return "JobDAG{" + strings.Join(parts, " ") + "}"
}

// uniqueStrings returns a slice with duplicates removed, preserving order.
func uniqueStrings(s []string) []string {
	seen := make(map[string]bool)
	result := make([]string, 0, len(s))
	for _, v := range s {
		if !seen[v] {
			seen[v] = true
			result = append(result, v)
		}
	}
	return result
}
