import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { ReviewListPanel } from "./ReviewListPanel";
import {
  mergeStrategyLabel,
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type MergePreview,
  type PullRequest,
  type PullRequestReview,
} from "../../../api/pullRequests";
import { formatWhenISO } from "../../../util/time";

export type PullRequestTab = "activities" | "changes" | "code-comments";

type PullRequestDetailShellProps = {
  projectPath: string;
  requestNumber: string;
  pr: PullRequest | null;
  reviews?: PullRequestReview[];
  activeTab: PullRequestTab;
  mergePreview?: MergePreview | null;
  loading?: boolean;
  error?: string | null;
  actionPending?: boolean;
  onMerge?: () => void;
  onDiscard?: () => void;
  onReopen?: () => void;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onRemoveReviewer?: (userId: number) => void;
  onRequestReviewAgain?: (userId: number) => void;
  onMergeStrategyChange?: (strategy: string) => void;
  addReviewerSlot?: ReactNode;
  children: ReactNode;
};

const MERGE_STRATEGIES = [
  "CREATE_MERGE_COMMIT",
  "CREATE_MERGE_COMMIT_IF_NECESSARY",
  "SQUASH_SOURCE_BRANCH_COMMITS",
  "REBASE_SOURCE_BRANCH_COMMITS",
] as const;

export function PullRequestDetailShell({
  projectPath,
  requestNumber,
  pr,
  reviews = [],
  activeTab,
  mergePreview,
  loading,
  error,
  actionPending,
  onMerge,
  onDiscard,
  onReopen,
  onApprove,
  onRequestChanges,
  onRemoveReviewer,
  onRequestReviewAgain,
  onMergeStrategyChange,
  addReviewerSlot,
  children,
}: PullRequestDetailShellProps) {
  const base = `/${projectPath}/~pulls/${requestNumber}`;
  const pendingReviews = reviews.some((r) => r.status === "PENDING");
  const changesRequested = reviews.some((r) => r.status === "REQUESTED_FOR_CHANGES");

  return (
    <div className="pull-request-detail card m-2 m-sm-5">
      <div className="card-header align-items-center justify-content-start flex-nowrap d-flex">
        <div className="d-flex align-items-center flex-grow-1">
          <div className="card-title mr-3">
            <span>{pr?.title ?? (loading ? "Loading…" : "Pull Request")}</span>
            <span className="text-muted ml-1">#{requestNumber}</span>
          </div>
        </div>
      </div>
      <div className="card-body d-flex">
        <div className="main flex-grow-1">
          {error && <div className="alert alert-danger">{error}</div>}

          {pr && (
            <>
              <div className="status-bar d-flex mb-4 flex-wrap align-items-center">
                <div className={`badge status mr-3 ${pullRequestStatusBadge(pr.status)}`}>
                  {pullRequestStatusLabel(pr.status)}
                </div>
                <div className="branches text-muted font-size-sm mr-3">
                  <Icon name="branch" />
                  <span className="mx-1">{pr.sourceBranch}</span>
                  <span className="mx-1">&rarr;</span>
                  <span className="mx-1">{pr.targetBranch}</span>
                </div>
                <Link
                  to={`/${projectPath}/~pulls/new`}
                  className="btn btn-primary btn-icon flex-shrink-0 ml-auto"
                  title="Open new pull request"
                >
                  <Icon name="plus" />
                </Link>
              </div>

              <div className="primary border border-dashed border-primary rounded p-4 mb-4">
                <div className="description">
                  <div className="mb-3 text-muted font-size-sm">
                    <strong>{pr.submitter?.name ?? "Unknown"}</strong> opened {formatWhenISO(pr.submitDate)}
                  </div>
                  {pr.description ? (
                    <div className="content">{pr.description}</div>
                  ) : (
                    <div className="content text-muted font-italic">No description</div>
                  )}
                </div>
                {pr.status === "OPEN" && mergePreview && (
                  <div className="summary font-size-h6 border-top pt-4 mt-4">
                    {mergePreview.conflicted ? (
                      <div className="has-merge-conflict text-warning">
                        <Icon name="exclamation-circle" /> There are merge conflicts.
                      </div>
                    ) : (
                      <div className="calculated-merge-preview text-success">
                        <Icon name="tick-circle" /> Able to merge without conflicts
                      </div>
                    )}
                    {changesRequested && (
                      <div className="requested-for-changes text-warning mt-2">
                        <Icon name="diff" /> Pull request cannot be merged now as it was requested for changes
                      </div>
                    )}
                    {pendingReviews && (
                      <div className="waiting-for-reviews text-warning mt-2">
                        <Icon name="clock" /> Pull request cannot be merged now as it is pending review
                      </div>
                    )}
                  </div>
                )}
                {pr.status === "MERGED" && (
                  <div className="summary font-size-h6 border-top pt-4 mt-4 merged text-success">
                    <Icon name="tick-circle" /> Commits were merged into target branch
                  </div>
                )}
                {pr.status === "DISCARDED" && (
                  <div className="summary font-size-h6 border-top pt-4 mt-4 discarded text-info">
                    <Icon name="info-circle" /> This pull request has been discarded
                  </div>
                )}
              </div>

              <div className="operations mb-3">
                {pr.status === "OPEN" && onMerge && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-success btn-hover-success mr-2"
                    disabled={actionPending || mergePreview?.conflicted || pendingReviews || changesRequested}
                    onClick={onMerge}
                  >
                    Merge
                  </button>
                )}
                {pr.status === "OPEN" && onDiscard && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-info btn-hover-info mr-2"
                    disabled={actionPending}
                    onClick={onDiscard}
                  >
                    Discard
                  </button>
                )}
                {pr.status === "OPEN" && onApprove && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-success btn-hover-success mr-2"
                    disabled={actionPending}
                    onClick={onApprove}
                  >
                    Approve
                  </button>
                )}
                {pr.status === "OPEN" && onRequestChanges && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-warning btn-hover-warning mr-2"
                    disabled={actionPending}
                    onClick={onRequestChanges}
                  >
                    Request For Changes
                  </button>
                )}
                {pr.status === "DISCARDED" && onReopen && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-primary btn-hover-primary mr-2"
                    disabled={actionPending}
                    onClick={onReopen}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </>
          )}

          <ul className="nav nav-tabs nav-tabs-line nav-bold mb-5 mt-3 align-items-center">
            <li className="nav-item">
              <Link to={base} className={`nav-link${activeTab === "activities" ? " active" : ""}`}>
                Activities
              </Link>
            </li>
            <li className="nav-item">
              <Link to={`${base}/changes`} className={`nav-link${activeTab === "changes" ? " active" : ""}`}>
                Changes
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`${base}/code-comments`}
                className={`nav-link${activeTab === "code-comments" ? " active" : ""}`}
              >
                Code Comments
              </Link>
            </li>
          </ul>

          {children}
        </div>

        {pr && (
          <div className="more-info flex-shrink-0 ml-4 d-none d-xl-block" style={{ width: "280px" }}>
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
          </div>
        )}
      </div>
    </div>
  );
}
