package model

import "time"

const CodeCommentMaxContentLen = 100000

// Mark anchors a code comment to a file location at a specific commit.
type Mark struct {
	CommitHash string       `json:"commitHash"`
	Path       string       `json:"path"`
	Range      *PlanarRange `json:"range,omitempty"`
}

// CodeComment is a review comment on a code selection.
type CodeComment struct {
	ID         int64     `json:"id"`
	ProjectID  int64     `json:"projectId"`
	User       *User     `json:"user,omitempty"`
	Content    string    `json:"content"`
	CreateDate time.Time `json:"createDate"`
	ReplyCount int       `json:"replyCount"`
	Resolved   bool      `json:"resolved"`
	UUID       string    `json:"uuid"`
	Mark       Mark      `json:"mark"`
}
