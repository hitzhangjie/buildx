import { useState, type ReactNode } from "react";
import { ReviewListPanel } from "./ReviewListPanel";
import { AssignmentListPanel } from "./AssignmentListPanel";
import { BeanSwitch } from "../BeanSwitch";
import { Icon } from "../Icon";
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
  currentUser?: { id: number; name: string } | null;
  autoMergeEnabled?: boolean;
  onMergeStrategyChange?: (strategy: string) => void;
  onRemoveReviewer?: (userId: number) => void;
  onRequestReviewAgain?: (userId: number) => void;
  onAssignToMe?: () => void;
  onSynchronize?: () => void;
  onDelete?: () => void;
  onAutoMergeChange?: (enabled: boolean) => void;
  onChangeTargetBranch?: (branch: string) => void;
  onUpdateSourceBranch?: (method: "merge" | "rebase") => void;
  sourceBranchOutdated?: boolean;
  addReviewerSlot?: ReactNode;
  // Role-based flags (computed by parent, matches OneDev PullRequestDetailPage)
  canModify?: boolean;
  canWriteCode?: boolean;
}

const MERGE_STRATEGIES = [
  "CREATE_MERGE_COMMIT",
  "CREATE_MERGE_COMMIT_IF_NECESSARY",
  "SQUASH_SOURCE_BRANCH_COMMITS",
  "REBASE_SOURCE_BRANCH_COMMITS",
] as const;

const MERGE_STRATEGY_HELP: Record<string, string> = {
  CREATE_MERGE_COMMIT:
    "A merge commit is always created, preserving all commits from the source branch.",
  CREATE_MERGE_COMMIT_IF_NECESSARY:
    "A merge commit is only created when necessary (e.g., when fast-forward is not possible).",
  SQUASH_SOURCE_BRANCH_COMMITS:
    "All commits from the source branch are squashed into a single commit on the target branch.",
  REBASE_SOURCE_BRANCH_COMMITS:
    "Commits from the source branch are rebased onto the target branch.",
};

export function PullRequestMoreInfoPanel({
  pr,
  reviews,
  assignments,
  actionPending,
  currentUser,
  autoMergeEnabled,
  onMergeStrategyChange,
  onRemoveReviewer,
  onRequestReviewAgain,
  onAssignToMe,
  onSynchronize,
  onDelete,
  onAutoMergeChange,
  onChangeTargetBranch,
  addReviewerSlot,
  canModify = false,
  canWriteCode = false,
}: PullRequestMoreInfoPanelProps) {
  const [changingTarget, setChangingTarget] = useState(false);
  const [newTarget, setNewTarget] = useState("");
  const isOpen = pr.status === "OPEN";
  const isCurrentUserAssigned = currentUser
    ? assignments.some((a) => a.user?.id === currentUser.id)
    : false;

  const ref = pr.targetProject?.path ? `${pr.targetProject.path}#${pr.number}` : `#${pr.number}`;

  return (
    <div className="more-info flex-shrink-0 ml-4 d-none d-xl-block" style={{ width: "280px" }}>
      <div className="body">
        {/* 1. Submission */}
        <div className="submission">
          <table className="table table-borderless">
            <tbody>
              <tr>
                <td className="name">Submitter</td>
                <td className="value text-break text-right">
                  {pr.submitter?.name ?? "Unknown"}
                </td>
              </tr>
              <tr>
                <td className="name">Target</td>
                <td className="value text-break text-right">
                  {isOpen && onChangeTargetBranch && canModify && (
                    <a
                      className="btn btn-xs btn-icon btn-light btn-hover-primary mr-1"
                      title="Change"
                      onClick={(e) => {
                        e.preventDefault();
                        if (changingTarget) {
                          setChangingTarget(false);
                        } else {
                          setNewTarget(pr.targetBranch);
                          setChangingTarget(true);
                        }
                      }}
                    >
                      <Icon name="arrow" className="rotate-90 icon" />
                    </a>
                  )}
                  {changingTarget && onChangeTargetBranch ? (
                    <span className="d-inline-flex align-items-center">
                      <input
                        type="text"
                        className="form-control form-control-sm"
                        style={{ width: "100px" }}
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
                    <span>{pr.targetBranch}</span>
                  )}
                </td>
              </tr>
              <tr>
                <td className="name">Source</td>
                <td className="value text-right text-break">{pr.sourceBranch}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 2. Reviews */}
        <div className="reviews">
          <div className="head">Reviewers</div>
          <div className="body">
            <ReviewListPanel
              reviews={reviews}
              editable={isOpen && canModify}
              onRemove={onRemoveReviewer}
              onRequestAgain={onRequestReviewAgain}
              addReviewerSlot={addReviewerSlot}
            />
          </div>
          <div className="font-size-sm text-muted form-text">
            Pull request can only be merged after getting approvals from all reviewers
          </div>
        </div>

        {/* 3. Jobs (placeholder) */}
        <div className="jobs">
          <div className="head">Jobs</div>
          <div className="body">
            <div className="text-muted font-size-sm">No job information available</div>
          </div>
        </div>

        {/* 4. Assignees */}
        <div className="assignments">
          <div className="head d-flex">
            <span className="mr-2">Assignees</span>
            {/* canModify + canWriteCode required (OneDev: canWriteCode + canModifyPullRequest) */}
            {isOpen && onAssignToMe && currentUser && !isCurrentUserAssigned && canModify && canWriteCode && (
              <a
                className="ml-auto font-size-sm font-weight-normal"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  onAssignToMe();
                }}
              >
                assign to me
              </a>
            )}
          </div>
          <div className="body">
            <AssignmentListPanel assignments={assignments} editable={isOpen} />
          </div>
          <div className="font-size-sm text-muted form-text">
            Assignees are expected to merge the pull request
          </div>
        </div>

        {/* 5. Merge Strategy */}
        <div className="merge-strategy">
          <div className="head">Merge Strategy</div>
          <div className="body">
            {onMergeStrategyChange && isOpen && canModify ? (
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
            <div className="font-size-sm text-muted form-text mt-1">
              {MERGE_STRATEGY_HELP[pr.mergeStrategy ?? "CREATE_MERGE_COMMIT_IF_NECESSARY"] ??
                MERGE_STRATEGY_HELP.CREATE_MERGE_COMMIT_IF_NECESSARY}
            </div>
          </div>
        </div>

        {/* 6. Auto Merge */}
        {/* Auto Merge requires canModify + canWriteCode (OneDev) */}
        {isOpen && onAutoMergeChange && canModify && canWriteCode && (
          <div className="auto-merge">
            <div className="head d-flex">
              <span className="mr-2">
                Auto Merge{" "}
                {autoMergeEnabled && (
                  <span className="ml-2 badge badge-sm badge-info">ON</span>
                )}
              </span>
              <div className="ml-auto">
                <BeanSwitch
                  checked={autoMergeEnabled ?? false}
                  onChange={onAutoMergeChange}
                  disabled={actionPending}
                />
              </div>
            </div>
            <div className="body">
              <div className="font-size-sm text-muted form-text">
                {autoMergeEnabled
                  ? "Pull request will be merged automatically when ready. This option will be disabled upon adding new commits, changing merge strategy, or switching target branch"
                  : "Enable this option to merge the pull request automatically when ready (all reviewers approved, all required jobs passed etc.)"}
              </div>
            </div>
          </div>
        )}

        {/* 7. Labels */}
        <div className="labels">
          <div className="head d-flex align-items-center justify-content-between mb-3">
            <span className="font-weight-bolder">Labels</span>
            <Icon name="gear" className="icon icon-sm" />
          </div>
          <div className="body d-flex align-items-center">
            <span className="text-muted font-size-sm">None</span>
          </div>
          <span className="form-text font-size-sm text-muted">
            <Icon name="bulb" className="icon icon-sm" /> Labels can be defined in
            Administration / Label Management
          </span>
        </div>

        {/* 8. Reference */}
        <div className="reference">
          <div className="head">Reference</div>
          <div className="body font-size-sm">
            <code>{ref}</code>
          </div>
        </div>

        {/* 9. Actions — only visible when canModify (OneDev) */}
        {canModify && (
        <div className="d-flex align-items-center justify-content-between">
          {onSynchronize && (
            <div className="synchronize d-flex align-items-center mr-3">
              <button
                type="button"
                className="btn btn-light-primary mr-2"
                disabled={actionPending}
                onClick={onSynchronize}
              >
                Synchronize
              </button>
              <a
                href="#"
                className="help text-muted text-hover-primary"
                title="In case the pull request status is out of sync with underlying repository, you may synchronize them manually here"
                onClick={(e) => e.preventDefault()}
              >
                <Icon name="question-circle-o" />
              </a>
            </div>
          )}
          {onDelete && (
            <button
              type="button"
              className="delete btn btn-light-danger"
              disabled={actionPending}
              onClick={() => {
                if (confirm("Are you sure you want to delete this pull request?")) {
                  onDelete();
                }
              }}
            >
              Delete
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
