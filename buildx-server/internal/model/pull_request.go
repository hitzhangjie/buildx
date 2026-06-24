package model

import "time"

const (
	PullRequestMaxTitleLen       = 255
	PullRequestMaxDescriptionLen = 100000
)

type PullRequestStatus string

const (
	PullRequestStatusOpen      PullRequestStatus = "OPEN"
	PullRequestStatusMerged    PullRequestStatus = "MERGED"
	PullRequestStatusDiscarded PullRequestStatus = "DISCARDED"
)

type MergeStrategy string

const (
	MergeStrategyCreateMergeCommit            MergeStrategy = "CREATE_MERGE_COMMIT"
	MergeStrategyCreateMergeCommitIfNecessary MergeStrategy = "CREATE_MERGE_COMMIT_IF_NECESSARY"
	MergeStrategySquashSourceBranchCommits    MergeStrategy = "SQUASH_SOURCE_BRANCH_COMMITS"
	MergeStrategyRebaseSourceBranchCommits    MergeStrategy = "REBASE_SOURCE_BRANCH_COMMITS"
)

type PullRequestReviewStatus string

const (
	PullRequestReviewPending             PullRequestReviewStatus = "PENDING"
	PullRequestReviewApproved            PullRequestReviewStatus = "APPROVED"
	PullRequestReviewRequestedForChanges PullRequestReviewStatus = "REQUESTED_FOR_CHANGES"
	PullRequestReviewExcluded            PullRequestReviewStatus = "EXCLUDED"
)

// PullRequest is a proposed merge between branches.
type PullRequest struct {
	ID              int64             `json:"id"`
	Number          int               `json:"number"`
	Title           string            `json:"title"`
	Description     string            `json:"description"`
	Status          PullRequestStatus `json:"status"`
	SubmitDate      time.Time         `json:"submitDate"`
	CloseDate       *time.Time        `json:"closeDate,omitempty"`
	TargetProject   *Project          `json:"targetProject,omitempty"`
	SourceProject   *Project          `json:"sourceProject,omitempty"`
	TargetBranch    string            `json:"targetBranch"`
	SourceBranch    string            `json:"sourceBranch"`
	Submitter       *User             `json:"submitter,omitempty"`
	MergeStrategy   MergeStrategy     `json:"mergeStrategy"`
	BaseCommitHash  string            `json:"baseCommitHash"`
	BuildCommitHash string            `json:"buildCommitHash"`
	CommentCount    int               `json:"commentCount"`
}

func (pr *PullRequest) IsOpen() bool {
	return pr != nil && pr.Status == PullRequestStatusOpen
}

// PullRequestComment is a discussion comment on a pull request.
type PullRequestComment struct {
	ID         int64     `json:"id"`
	RequestID  int64     `json:"requestId"`
	User       *User     `json:"user,omitempty"`
	Content    string    `json:"content"`
	CreateDate time.Time `json:"createDate"`
}

// PullRequestReview tracks reviewer approval state.
type PullRequestReview struct {
	ID        int64                   `json:"id"`
	RequestID int64                   `json:"requestId"`
	User      *User                   `json:"user,omitempty"`
	Status    PullRequestReviewStatus `json:"status"`
	Date      *time.Time              `json:"date,omitempty"`
}

// MergePreview summarizes merge eligibility.
type MergePreview struct {
	HeadCommitHash string `json:"headCommitHash"`
	MergeCommitHash string `json:"mergeCommitHash,omitempty"`
	Conflicted     bool   `json:"conflicted"`
}

// PullRequestOpenData is the create payload for POST /pulls.
type PullRequestOpenData struct {
	TargetProjectID int64         `json:"targetProjectId"`
	SourceProjectID int64         `json:"sourceProjectId"`
	TargetBranch    string        `json:"targetBranch"`
	SourceBranch    string        `json:"sourceBranch"`
	Title           string        `json:"title"`
	Description     string        `json:"description"`
	MergeStrategy   MergeStrategy `json:"mergeStrategy,omitempty"`
	ReviewerIDs     []int64       `json:"reviewerIds,omitempty"`
	AssigneeIDs     []int64       `json:"assigneeIds,omitempty"`
}
