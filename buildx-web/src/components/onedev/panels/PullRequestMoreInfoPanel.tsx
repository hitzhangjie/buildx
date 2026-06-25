import { useState, type ReactNode } from "react";
import { ReviewListPanel } from "./ReviewListPanel";
import { AssignmentListPanel } from "./AssignmentListPanel";
import {
  mergeStrategyLabel,
  type MergePreview,
  type PullRequest,
  type PullRequestReview,
  type PullRequestAssignment,
} from "../../../api/pullRequests";

interface PullRequestMoreInfoPanelProps {
  pr: PullRequest;
  reviews: PullRequestReview[];
  assignments: PullRequestAssignment[];
  mergePreview?: MergePreview | null;
  actionPending?: boolean;
  onMergeStrategyChange?: (strategy: string) => void;
  onRemoveReviewer?: (userId: number) => void;
  onRequestReviewAgain?: (userId: number) => void;
  addReviewerSlot?: ReactNode;
  onChangeTargetBranch?: (branch: string) => void;
}

const MERGE_STRATEGIES = [
  "CREATE_MERGE_COMMIT",
  "CREATE_MERGE_COMMIT_IF_NECESSARY",
  "SQUASH_SOURCE_BRANCH_COMMITS",
  "REBASE_SOURCE_BRANCH_COMMITS",
] as const;

export function PullRequestMoreInfoPanel({
  pr,
  reviews,
  assignments,
  actionPending,
  onMergeStrategyChange,
  onRemoveReviewer,
  onRequestReviewAgain,
  addReviewerSlot,
  onChangeTargetBranch,
}: PullRequestMoreInfoPanelProps) {
  const [changingTarget, setChangingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState("");

  return (
    <div className="more-info flex-shrink-0 ml-4 d-none d-xl-block" style={{ width: "280px" }}>
      {/* Submission info */}
      <div className="submission mb-4">
        <div className="head font-weight-bold mb-2">Details</div>
        <div className="body font-size-sm">
          <div className="mb-1">
            <span className="text-muted">Submitter:</span>{" "}
            <span>{pr.submitter?.name ?? "Unknown"}</span>
          </div>
          <div className="mb-1 d-flex align-items-center">
            <span className="text-muted mr-1">Target:</span>
            {changingTarget && onChangeTargetBranch ? (
              <span className="d-inline-flex align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm"
                  style={{ width: "120px" }}
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onChangeTargetBranch(newTarget.trim());
                      setChangingTarget(false);
                    }
                    if (e.key === "Escape") setChangingTarget(false);
                  }}
                  autoFocus
                />
              </span>
            ) : (
              <span>
                {pr.targetBranch}
                {pr.status === "OPEN" && onChangeTargetBranch && (
                  <a
                    href="#"
                    className="ml-1 text-muted"
                    onClick={(e) => {
                      e.preventDefault();
                      setNewTarget(pr.targetBranch);
                      setChangingTarget(true);
                    }}
                    title="Change target branch"
                  >
                    &#9998;
                  </a>
                )}
              </span>
            )}
          </div>
          <div className="mb-1">
            <span className="text-muted">Source:</span> <span>{pr.sourceBranch}</span>
          </div>
        </div>
      </div>

      {/* Reviewers */}
      <div className="reviews mb-4">
        <div className="head font-weight-bold mb-2">Reviewers</div>
        <div className="body">
          <ReviewListPanel
            reviews={reviews}
            editable={pr.status === "OPEN"}
            onRemove={onRemoveReviewer}
            onRequestAgain={onRequestReviewAgain}
            addReviewerSlot={addReviewerSlot}
          />
        </div>
        <div className="font-size-sm text-muted form-text mt-2">
          Pull request can only be merged after getting approvals from all reviewers
        </div>
      </div>

      {/* Assignees */}
      <div className="assignments mb-4">
        <div className="head font-weight-bold mb-2">Assignees</div>
        <div className="body">
          <AssignmentListPanel assignments={assignments} editable={pr.status === "OPEN"} />
        </div>
        <div className="font-size-sm text-muted form-text mt-2">
          Assignees have code write permission and will be responsible for merging the pull request
        </div>
      </div>

      {/* Merge Strategy */}
      <div className="merge-strategy mb-4">
        <div className="head font-weight-bold mb-2">Merge Strategy</div>
        <div className="body">
          {onMergeStrategyChange && pr.status === "OPEN" ? (
            <select
              className="form-control custom-select"
              value={pr.mergeStrategy ?? "CREATE_MERGE_COMMIT_IF_NECESSARY"}
              onChange={(e) => onMergeStrategyChange(e.target.value)}
              disabled={actionPending}
            >
              {MERGE_STRATEGIES.map((s) => (
                <option key={s} value={s}>
                  {mergeStrategyLabel(s)}
                </option>
              ))}
            </select>
          ) : (
            <span>{mergeStrategyLabel(pr.mergeStrategy)}</span>
          )}
        </div>
      </div>

      {/* Reference */}
      <div className="reference mb-4">
        <div className="head font-weight-bold mb-2">Reference</div>
        <div className="body font-size-sm">
          <code>{pr.targetProject?.path ?? ""}#{pr.number}</code>
        </div>
      </div>
    </div>
  );
}
