package api

import "context"

// CINotifier fires CI build triggers after git/PR events (async, best-effort).
type CINotifier interface {
	NotifyRefUpdated(ctx context.Context, projectID int64, refName, oldCommit, newCommit string, submitterID int64, changedFiles []string)
	NotifyPullRequestUpdated(ctx context.Context, projectID int64, commitHash, refName string, changedFiles []string, submitterID int64)
}
