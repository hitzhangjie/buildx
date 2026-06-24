package api

import (
	"context"
	"net/http"
	"strconv"
	"strings"

	"github.com/hitzhangjie/buildx/buildx-server/internal/git"
	"github.com/hitzhangjie/buildx/buildx-server/internal/model"
	"github.com/hitzhangjie/buildx/buildx-server/internal/pullrequest"
)

type effectivePullRequestFinder interface {
	FindEffective(
		ctx context.Context,
		targetProjectID int64,
		targetBranch string,
		sourceProjectID int64,
		sourceBranch string,
		sourceCommitHash string,
	) (*model.PullRequest, error)
}

// CompareRevision is one side of a revision compare request.
type CompareRevision struct {
	Revision   string `json:"revision"`
	CommitHash string `json:"commitHash"`
	Subject    string `json:"subject,omitempty"`
}

// CompareResult is the response for GET /repositories/{projectId}/compare.
type CompareResult struct {
	Left                  CompareRevision     `json:"left"`
	Right                 CompareRevision     `json:"right"`
	MergeBase             *CompareRevision    `json:"mergeBase,omitempty"`
	EffectivePullRequest  *model.PullRequest  `json:"effectivePullRequest,omitempty"`
	Commits               []git.Commit        `json:"commits,omitempty"`
	Diffs                 []git.FileDiff      `json:"diffs,omitempty"`
}

func (h *RepositoryHandler) Compare(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.Compare")
	repo, proj, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	left := strings.TrimSpace(r.URL.Query().Get("left"))
	right := strings.TrimSpace(r.URL.Query().Get("right"))
	if left == "" || right == "" {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "left and right revisions are required", nil)
		return
	}

	compareWithMergeBase := true
	if v := r.URL.Query().Get("compare-with-merge-base"); v != "" {
		parsed, err := strconv.ParseBool(v)
		if err != nil {
			op.Fail(err, http.StatusBadRequest, "compare-with-merge-base", v)
			writeBadRequest(w, r, "invalid compare-with-merge-base", err)
			return
		}
		compareWithMergeBase = parsed
	}

	includeCommits := r.URL.Query().Get("include-commits") == "true"
	includeDiffs := r.URL.Query().Get("include-diffs") == "true"
	includeEffectivePR := r.URL.Query().Get("include-effective-pull-request") == "true"
	pathFilter := r.URL.Query().Get("path-filter")
	whitespaceOption := r.URL.Query().Get("whitespace-option")

	count := 100
	if countStr := r.URL.Query().Get("count"); countStr != "" {
		parsed, err := strconv.Atoi(countStr)
		if err != nil || parsed <= 0 {
			op.Fail(err, http.StatusBadRequest, "count", countStr)
			writeBadRequest(w, r, "invalid count", err)
			return
		}
		count = parsed
	}

	op.With("left", left, "right", right, "compare_with_merge_base", compareWithMergeBase)

	leftDetail, err := repo.ResolveRevisionDetail(left)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid left revision", err)
		return
	}
	if leftDetail == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "revision", "left", left)
		return
	}

	rightDetail, err := repo.ResolveRevisionDetail(right)
	if err != nil {
		op.Fail(err, http.StatusBadRequest)
		writeBadRequest(w, r, "invalid right revision", err)
		return
	}
	if rightDetail == nil {
		op.OK(http.StatusNotFound, "found", false)
		writeNotFound(w, r, "revision", "right", right)
		return
	}

	result := CompareResult{
		Left:  toCompareRevision(leftDetail),
		Right: toCompareRevision(rightDetail),
	}

	mergeBaseHash, err := repo.MergeBase(leftDetail.CommitHash, rightDetail.CommitHash)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if mergeBaseHash != "" {
		mergeCommit, err := repo.GetCommit(mergeBaseHash)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		if mergeCommit != nil {
			result.MergeBase = &CompareRevision{
				Revision:   mergeBaseHash,
				CommitHash: mergeCommit.Hash,
				Subject:    mergeCommit.Subject,
			}
		}
	}

	oldRevision := leftDetail.CommitHash
	if compareWithMergeBase && mergeBaseHash != "" {
		oldRevision = mergeBaseHash
	}

	if includeEffectivePR && h.PullRequests != nil && mergeBaseHash != "" {
		if pr, err := h.PullRequests.FindEffective(
			r.Context(),
			proj.ID, left,
			proj.ID, right,
			rightDetail.CommitHash,
		); err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		} else if pr != nil {
			result.EffectivePullRequest = pr
		}
	}

	if includeCommits && mergeBaseHash != "" {
		commits, err := repo.ListCommitsSince(oldRevision, rightDetail.CommitHash, count)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		result.Commits = commits
	}

	if includeDiffs && mergeBaseHash != "" {
		diffs, err := repo.DiffRevisions(oldRevision, rightDetail.CommitHash, whitespaceOption)
		if err != nil {
			op.Fail(err, http.StatusInternalServerError)
			writeInternalError(w, r, err)
			return
		}
		result.Diffs = git.FilterDiffsByPath(diffs, pathFilter)
	}

	op.OK(http.StatusOK, "merge_base", mergeBaseHash != "")
	writeJSON(w, r, http.StatusOK, result)
}

func (h *RepositoryHandler) ComparePatch(w http.ResponseWriter, r *http.Request) {
	op := StartOp(r, "RepositoryHandler.ComparePatch")
	repo, _, _, ok := h.openRepo(w, r, op)
	if !ok {
		return
	}

	oldRev := strings.TrimSpace(r.URL.Query().Get("old"))
	newRev := strings.TrimSpace(r.URL.Query().Get("new"))
	if oldRev == "" || newRev == "" {
		op.Fail(nil, http.StatusBadRequest)
		writeBadRequest(w, r, "old and new revisions are required", nil)
		return
	}
	whitespaceOption := r.URL.Query().Get("whitespace-option")

	patch, err := repo.ExportPatch(oldRev, newRev, whitespaceOption)
	if err != nil {
		op.Fail(err, http.StatusInternalServerError)
		writeInternalError(w, r, err)
		return
	}
	if patch == nil {
		patch = []byte{}
	}

	op.OK(http.StatusOK, "bytes", len(patch))
	w.Header().Set("Content-Type", "application/octet-stream")
	w.Header().Set("Content-Disposition", `attachment; filename="changes.patch"`)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(patch)
}

func toCompareRevision(d *git.RevisionDetail) CompareRevision {
	return CompareRevision{
		Revision:   d.Revision,
		CommitHash: d.CommitHash,
		Subject:    d.Subject,
	}
}

// Ensure RepositoryHandler can use pull request store.
var _ effectivePullRequestFinder = (*pullrequest.DBStore)(nil)
