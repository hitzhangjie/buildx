import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { PullRequestMoreInfoPanel } from "./PullRequestMoreInfoPanel";
import {
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type MergePreview,
  type PullRequest,
  type PullRequestReview,
  type PullRequestAssignment,
} from "../../../api/pullRequests";
import { formatWhenISO } from "../../../util/time";

export type PullRequestTab = "activities" | "changes" | "code-comments";

type PullRequestDetailShellProps = {
  projectPath: string;
  requestNumber: string;
  pr: PullRequest | null;
  reviews?: PullRequestReview[];
  assignments?: PullRequestAssignment[];
  activeTab: PullRequestTab;
  mergePreview?: MergePreview | null;
  loading?: boolean;
  error?: string | null;
  actionPending?: boolean;

  // Operations.
  onMerge?: () => void;
  onDiscard?: () => void;
  onReopen?: () => void;
  onApprove?: () => void;
  onRequestChanges?: () => void;
  onDeleteSourceBranch?: () => void;
  onRestoreSourceBranch?: () => void;
  onSynchronize?: () => void;
  onDelete?: () => void;

  // Reviewers.
  onRemoveReviewer?: (userId: number) => void;
  onRequestReviewAgain?: (userId: number) => void;
  addReviewerSlot?: ReactNode;

  // Merge strategy.
  onMergeStrategyChange?: (strategy: string) => void;

  // Title.
  onTitleChange?: (title: string) => void;

  // Description.
  onDescriptionChange?: (description: string) => void;

  // Target branch change.
  onChangeTargetBranch?: (branch: string) => void;

  children: ReactNode;
};

export function PullRequestDetailShell({
  projectPath,
  requestNumber,
  pr,
  reviews = [],
  assignments = [],
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
  onDeleteSourceBranch,
  onRestoreSourceBranch,
  onSynchronize,
  onDelete,
  onRemoveReviewer,
  onRequestReviewAgain,
  onMergeStrategyChange,
  onTitleChange,
  onDescriptionChange,
  onChangeTargetBranch,
  addReviewerSlot,
  children,
}: PullRequestDetailShellProps) {
  const base = `/${projectPath}/~pulls/${requestNumber}`;
  const pendingReviews = reviews.some((r) => r.status === "PENDING");
  const changesRequested = reviews.some((r) => r.status === "REQUESTED_FOR_CHANGES");
  const isWIP = pr?.title?.startsWith("WIP") || pr?.title?.startsWith("[WIP]");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editingDescription, setEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState("");

  function handleTitleSave() {
    const trimmed = editedTitle.trim();
    if (trimmed && onTitleChange) {
      onTitleChange(trimmed);
    }
    setEditingTitle(false);
  }

  function handleDescriptionSave() {
    if (onDescriptionChange) {
      onDescriptionChange(editedDescription);
    }
    setEditingDescription(false);
  }

  return (
    <div className="pull-request-detail card m-2 m-sm-5">
      <div className="card-header align-items-center justify-content-start flex-nowrap d-flex">
        <div className="d-flex align-items-center flex-grow-1">
          <div className="card-title mr-3">
            {editingTitle && pr ? (
              <span className="d-inline-flex align-items-center">
                <input
                  type="text"
                  className="form-control form-control-sm d-inline-block"
                  style={{ width: "400px" }}
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSave();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  className="btn btn-sm btn-primary ml-1"
                  onClick={handleTitleSave}
                >
                  Save
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary ml-1"
                  onClick={() => setEditingTitle(false)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <span>
                {pr?.title ?? (loading ? "Loading…" : "Pull Request")}
                <span className="text-muted ml-1">#{requestNumber}</span>
                {pr?.status === "OPEN" && onTitleChange && (
                  <a
                    href="#"
                    className="ml-2 text-muted"
                    onClick={(e) => {
                      e.preventDefault();
                      setEditedTitle(pr.title);
                      setEditingTitle(true);
                    }}
                    title="Edit title"
                  >
                    <Icon name="edit" />
                  </a>
                )}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="card-body d-flex">
        <div className="main flex-grow-1">
          {error && <div className="alert alert-danger">{error}</div>}

          {pr && (
            <>
              {/* Status bar */}
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

              {/* Description area */}
              <div className="primary border border-dashed border-primary rounded p-4 mb-4">
                <div className="description">
                  <div className="mb-3 text-muted font-size-sm">
                    <strong>{pr.submitter?.name ?? "Unknown"}</strong> opened {formatWhenISO(pr.submitDate)}
                  </div>
                  {editingDescription ? (
                    <div>
                      <textarea
                        className="form-control mb-2"
                        rows={6}
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-primary mr-1"
                        onClick={handleDescriptionSave}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingDescription(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      {pr.description ? (
                        <div className="content">{pr.description}</div>
                      ) : (
                        <div className="content text-muted font-italic">No description</div>
                      )}
                      {pr.status === "OPEN" && onDescriptionChange && (
                        <a
                          href="#"
                          className="text-muted font-size-sm mt-1 d-inline-block"
                          onClick={(e) => {
                            e.preventDefault();
                            setEditedDescription(pr.description ?? "");
                            setEditingDescription(true);
                          }}
                        >
                          <Icon name="edit" className="mr-1" /> Edit
                        </a>
                      )}
                    </div>
                  )}
                </div>

                {/* Merge condition summary */}
                {pr.status === "OPEN" && (
                  <div className="summary font-size-h6 border-top pt-4 mt-4">
                    {isWIP && (
                      <div className="text-warning">
                        <Icon name="exclamation-circle" /> Work in progress — title starts with WIP
                      </div>
                    )}
                    {mergePreview?.conflicted && (
                      <div className="has-merge-conflict text-warning">
                        <Icon name="exclamation-circle" /> There are merge conflicts.
                      </div>
                    )}
                    {!mergePreview?.conflicted && mergePreview && (
                      <div className="calculated-merge-preview text-success">
                        <Icon name="tick-circle" /> Able to merge without conflicts
                      </div>
                    )}
                    {changesRequested && (
                      <div className="requested-for-changes text-warning mt-2">
                        <Icon name="diff" /> Pull request cannot be merged as it was requested for changes
                      </div>
                    )}
                    {pendingReviews && (
                      <div className="waiting-for-reviews text-warning mt-2">
                        <Icon name="clock" /> Pull request cannot be merged as it is pending review
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

              {/* Operations bar */}
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
                {pr.status === "OPEN" && onDeleteSourceBranch && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-danger btn-hover-danger mr-2"
                    disabled={actionPending}
                    onClick={onDeleteSourceBranch}
                  >
                    Delete Source Branch
                  </button>
                )}
                {pr.status === "OPEN" && onRestoreSourceBranch && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-success btn-hover-success mr-2"
                    disabled={actionPending}
                    onClick={onRestoreSourceBranch}
                  >
                    Restore Source Branch
                  </button>
                )}
                {pr.status === "OPEN" && onSynchronize && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-primary btn-hover-primary mr-2"
                    disabled={actionPending}
                    onClick={onSynchronize}
                  >
                    Sync
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    className="btn btn-sm btn-light-danger btn-hover-danger mr-2"
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
            </>
          )}

          {/* Tabs */}
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

        {/* Sidebar */}
        {pr && (
          <PullRequestMoreInfoPanel
            pr={pr}
            reviews={reviews}
            assignments={assignments}
            mergePreview={mergePreview}
            actionPending={actionPending}
            onMergeStrategyChange={onMergeStrategyChange}
            onRemoveReviewer={onRemoveReviewer}
            onRequestReviewAgain={onRequestReviewAgain}
            addReviewerSlot={addReviewerSlot}
            onChangeTargetBranch={onChangeTargetBranch}
          />
        )}
      </div>
    </div>
  );
}
