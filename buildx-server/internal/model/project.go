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
}
