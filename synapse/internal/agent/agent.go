// Package agent defines AI-first workflow hooks — skills, context assembly, and automation.
//
// This is a first-class concern for Synapse, enabling tight integration between
// human and AI-driven development workflows.
package agent

import "context"

// Skill describes an agent capability exposed via CLI or API.
type Skill struct {
	ID          string
	Name        string
	Description string
}

// Context bundles cross-entity state for AI agents (issue + PR + build + code).
type Context struct {
	ProjectID int64
	IssueID   *int64
	PRID      *int64
	BuildID   *int64
}

// Service assembles unified context across dev workflow stages.
type Service interface {
	AssembleContext(ctx context.Context, c Context) (map[string]any, error)
	ListSkills(ctx context.Context) ([]Skill, error)
}
