package model

import "time"

const IssueMaxTitleLen = 255
const IssueMaxDescriptionLen = 65535
const IssueCommentMaxContentLen = 100000

// Issue is a work item in a project (maps to o_Issue).
type Issue struct {
	ID           int64     `json:"id"`
	ProjectID    int64     `json:"projectId"`
	Project      *Project  `json:"project,omitempty"`
	Number       int       `json:"number"`
	Title        string    `json:"title"`
	Description  string    `json:"description"`
	State        string    `json:"state"`
	StateOrdinal int       `json:"stateOrdinal"`
	Submitter    *User     `json:"submitter,omitempty"`
	SubmitDate   time.Time `json:"submitDate"`
	VoteCount    int       `json:"voteCount"`
	CommentCount int       `json:"commentCount"`
	Confidential bool      `json:"confidential"`
	UUID         string    `json:"uuid"`
}

// IssueComment is a comment on an issue (maps to o_IssueComment).
type IssueComment struct {
	ID             int64     `json:"id"`
	IssueID        int64     `json:"issueId"`
	Issue          *Issue    `json:"issue,omitempty"`
	User           *User     `json:"user,omitempty"`
	Content        string    `json:"content"`
	CreateDate     time.Time `json:"createDate"`
	RevisionCount  int       `json:"revisionCount"`
}
