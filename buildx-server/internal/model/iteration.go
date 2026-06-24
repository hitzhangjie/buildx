package model

// Iteration is a sprint/iteration (maps to o_Iteration).
type Iteration struct {
	ID           int64    `json:"id"`
	ProjectID    int64    `json:"-"`
	Project      *Project `json:"project,omitempty"`
	Name         string   `json:"name"`
	Description  string   `json:"description,omitempty"`
	StartDay     *int64   `json:"startDay,omitempty"`
	DueDay       *int64   `json:"dueDay,omitempty"`
	Closed       bool     `json:"closed"`
	ScheduleCount int     `json:"scheduleCount,omitempty"`
}
