package model

import "time"

// Project is a repository container (maps to o_Project).
type Project struct {
	ID          int64     `json:"id"`
	Name        string    `json:"name"`
	Path        string    `json:"path"`
	PathLen     int       `json:"pathLen"`
	Key         string    `json:"key"`
	Description string    `json:"description,omitempty"`
	ParentID    *int64    `json:"parentId,omitempty"`
	CreateDate  time.Time `json:"createDate"`

	// Management toggles (mirrors OneDev Project booleans, default true except TimeTracking).
	CodeManagement  bool `json:"codeManagement"`
	PackManagement  bool `json:"packManagement"`
	IssueManagement bool `json:"issueManagement"`
	TimeTracking    bool `json:"timeTracking"`

	// Service desk email address.
	ServiceDeskEmailAddress string `json:"serviceDeskEmailAddress,omitempty"`

	// Settings contains all project settings, loaded from separate JSON columns.
	// This is populated by the DB store from the o_Project table's JSON columns.
	Settings *ProjectSetting `json:"settings,omitempty"`
}
