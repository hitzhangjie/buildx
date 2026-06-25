import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { InlineDropdown } from "../DropdownMenu";
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
import "../../../pages/project/pullrequests/pull-request-detail.css";

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
  onUpdateSourceBranch?: (method: "merge" | "rebase") => void;
  onDelete?: () => void;

  // Sidebar actions.
  onSynchronize?: () => void;
  onAssignToMe?: () => void;
  onAutoMergeChange?: (enabled: boolean) => void;
  autoMergeEnabled?: boolean;
  currentUser?: { id: number; name: string } | null;

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

  // Source branch outdated.
  sourceBranchOutdated?: boolean;

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
  onUpdateSourceBranch,
  onDelete,
  onSynchronize,
  onAssignToMe,
  onAutoMergeChange,
  autoMergeEnabled,
  currentUser,
  onRemoveReviewer,
  onRequestReviewAgain,
  onMergeStrategyChange,
  onTitleChange,
  onDescriptionChange,
  onChangeTargetBranch,
  sourceBranchOutdated,
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
  const [sideInfoVisible, setSideInfoVisible] = useState(true);

  // ---- Role-based visibility (matches OneDev PullRequestDetailPage.java) ----
  const currentUserId = currentUser?.id;
  const isSubmitter = currentUserId != null && pr?.submitter?.id === currentUserId;
  const isAssignee = currentUserId != null && assignments.some((a) => a.user?.id === currentUserId);
  // canModifyPullRequest: submitter, assignee, or has ManagePullRequests permission.
  // Used for: Discard, Reopen, Delete/Restore Source Branch, title/description edit,
  //           target branch change, merge strategy, auto-merge toggle, sync/delete.
  const canModify = isSubmitter || isAssignee;
  // canWriteCode: WriteCode project permission — SEPARATE from canModifyPullRequest.
  // Used for: Merge, Update Source Branch.
  // TODO: replace with server-provided permission via API when available.
  // Conservative approximation: exclude the submitter so they cannot self-merge.
  const canWriteCode = canModify && !isSubmitter;
  // User is a reviewer with PENDING status (Approve / Request For Changes)
  const isPendingReviewer =
    currentUserId != null &&
    reviews.some((r) => r.user?.id === currentUserId && r.status === "PENDING");

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

  const isOpen = pr?.status === "OPEN";
  const isCalculatingMergePreview = isOpen && mergePreview === null && !loading;
  const hasMergeConflict = mergePreview?.conflicted;
  const mergeable = mergePreview && !mergePreview.conflicted;

  return (
    <div className="pull-request-detail card m-2 m-sm-5">
      {/* Header */}
      <div className="card-header align-items-center justify-content-start flex-nowrap d-flex">
        <div className="d-flex align-items-center flex-grow-1">
          {editingTitle && pr ? (
            <form
              className="form flex-grow-1 d-flex align-items-center"
              onSubmit={(e) => {
                e.preventDefault();
                handleTitleSave();
              }}
            >
              <div className="clearable-wrapper mr-3 flex-grow-1">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Input title"
                  value={editedTitle}
                  onChange={(e) => setEditedTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  autoFocus
                />
              </div>
              <div className="flex-shrink-0 text-nowrap">
                <button
                  type="submit"
                  className="btn btn-primary btn-icon mr-1"
                  title="Save"
                >
                  <Icon name="tick" />
                </button>
                <a
                  className="btn btn-secondary btn-icon"
                  title="Cancel"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditingTitle(false);
                  }}
                >
                  <Icon name="times" />
                </a>
              </div>
            </form>
          ) : (
            <>
              <div className="card-title mr-3">
                <span>{pr?.title ?? (loading ? "Loading…" : "Pull Request")}</span>
                <span className="text-muted ml-1">#{requestNumber}</span>
              </div>
              {isOpen && onTitleChange && canModify && (
                <a
                  className="btn btn-xs btn-icon btn-light btn-hover-primary edit mr-3"
                  title="Edit title"
                  onClick={(e) => {
                    e.preventDefault();
                    setEditedTitle(pr!.title);
                    setEditingTitle(true);
                  }}
                >
                  <Icon name="edit" />
                </a>
              )}
            </>
          )}
        </div>
        <a
          className="side-info flex-shrink-0 ml-3"
          title="More info"
          onClick={(e) => {
            e.preventDefault();
            setSideInfoVisible((v) => !v);
          }}
        >
          <Icon name="ellipsis" />
        </a>
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
                <a className="btn btn-outline-secondary btn-sm mr-3" title="Workspaces on source branch">
                  Workspaces <Icon name="arrow" className="icon rotate-90" />
                </a>
                <a
                  className="btn btn-outline-secondary btn-icon mr-3"
                  title="Check out to local directory"
                >
                  <Icon name="download2" />
                </a>
                <Link
                  to={`/${projectPath}/~pulls/new`}
                  className="btn btn-primary btn-icon flex-shrink-0 ml-auto"
                  title="Open new pull request"
                >
                  <Icon name="plus" />
                </Link>
              </div>

              {/* Primary (description + summary) */}
              <div className="primary border border-dashed border-primary rounded p-4 mb-4">
                <div className="description">
                  <div className="mb-3">
                    <span>{pr.submitter?.name ?? "Unknown"}</span>{" "}
                    opened <span>{formatWhenISO(pr.submitDate)}</span>
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
                        <Icon name="tick" /> Save
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-secondary"
                        onClick={() => setEditingDescription(false)}
                      >
                        <Icon name="times" /> Cancel
                      </button>
                    </div>
                  ) : (
                    <div>
                      {pr.description ? (
                        <div className="content">{pr.description}</div>
                      ) : (
                        <div className="content text-muted font-italic">No description</div>
                      )}
                      {isOpen && onDescriptionChange && canModify && (
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
                <div className="summary font-size-h6 border-top pt-4 mt-4">
                  {/* WIP */}
                  {isOpen && isWIP && (
                    <div className="work-in-progress text-warning">
                      <Icon name="clock" /> Pull request is still a work in progress
                    </div>
                  )}

                  {/* Calculating merge preview */}
                  {isCalculatingMergePreview && (
                    <div className="calculating-merge-preview text-warning d-flex align-items-center">
                      <Icon name="loading" className="icon spin mr-2" /> Calculating merge preview...
                    </div>
                  )}

                  {/* Merge conflict */}
                  {isOpen && hasMergeConflict && (
                    <div className="has-merge-conflict text-warning">
                      <Icon name="exclamation-circle" /> There are merge conflicts.
                    </div>
                  )}

                  {/* Mergeable */}
                  {isOpen && mergeable && (
                    <div className="calculated-merge-preview text-success">
                      <Icon name="tick-circle" /> Able to merge without conflicts
                    </div>
                  )}

                  {/* Source branch outdated */}
                  {isOpen && sourceBranchOutdated && !hasMergeConflict && (
                    <div className="source-branch-outdated text-primary">
                      <Icon name="info-circle" /> Source branch is outdated{" "}
                      <a className="link-primary" title="Show changes">
                        <Icon name="diff" />
                      </a>
                    </div>
                  )}

                  {/* Requested for changes */}
                  {isOpen && changesRequested && (
                    <div className="requested-for-changes text-warning">
                      <Icon name="diff" /> Pull request cannot be merged now as it was requested for changes
                    </div>
                  )}

                  {/* Waiting for reviews */}
                  {isOpen && pendingReviews && (
                    <div className="waiting-for-reviews text-warning">
                      <Icon name="clock" /> Pull request cannot be merged now as it is pending review
                    </div>
                  )}

                  {/* Merged */}
                  {pr.status === "MERGED" && (
                    <div className="merged text-success">
                      <Icon name="tick-circle" /> Commits were merged into target branch
                    </div>
                  )}

                  {/* Discarded */}
                  {pr.status === "DISCARDED" && (
                    <div className="discarded text-info">
                      <Icon name="info-circle" /> This pull request has been discarded
                    </div>
                  )}
                </div>
              </div>

              {/* Operations bar — visibility matches OneDev PullRequestDetailPage#newOperationsContainer */}
              <div className="operations d-flex flex-wrap align-items-center">
                {/* Merge: requires WriteCode permission + merge conditions met */}
                {isOpen && onMerge && canWriteCode && mergeable && !hasMergeConflict && (
                  <a
                    className="btn btn-sm btn-light-success btn-hover-success"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onMerge(); }}
                  >
                    Merge
                  </a>
                )}
                {/* Discard: submitter, assignee, or manage permission */}
                {isOpen && onDiscard && canModify && (
                  <a
                    className="btn btn-sm btn-light-info btn-hover-info"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onDiscard(); }}
                  >
                    Discard
                  </a>
                )}
                {/* Approve: user has a pending review */}
                {isOpen && onApprove && isPendingReviewer && (
                  <a
                    className="btn btn-sm btn-light-success btn-hover-success"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onApprove(); }}
                  >
                    Approve
                  </a>
                )}
                {/* Request For Changes: user has a pending review */}
                {isOpen && onRequestChanges && isPendingReviewer && (
                  <a
                    className="btn btn-sm btn-light-warning btn-hover-warning"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onRequestChanges(); }}
                  >
                    Request For Changes
                  </a>
                )}
                {/* Reopen: can modify PR + discarded */}
                {pr.status === "DISCARDED" && onReopen && canModify && (
                  <a
                    className="btn btn-sm btn-light-primary btn-hover-primary"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onReopen(); }}
                  >
                    Reopen
                  </a>
                )}
                {/* Update Source Branch: WriteCode + source outdated */}
                {isOpen && onUpdateSourceBranch && canWriteCode && sourceBranchOutdated && (
                  <InlineDropdown
                    label={
                      <>
                        <span>Update Source Branch</span>{" "}
                        <Icon name="arrow" className="icon rotate-90" />
                      </>
                    }
                    className="btn btn-sm btn-light-primary btn-hover-primary"
                    wrapperClassName="mb-1-2"
                  >
                    {({ close }) => (
                      <div className="dropdown-menu-content">
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onUpdateSourceBranch("merge");
                            close();
                          }}
                        >
                          Merge
                        </a>
                        <a
                          className="dropdown-item"
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            onUpdateSourceBranch("rebase");
                            close();
                          }}
                        >
                          Rebase
                        </a>
                      </div>
                    )}
                  </InlineDropdown>
                )}
                {/* Delete Source Branch: can modify PR + can delete branch */}
                {isOpen && onDeleteSourceBranch && canModify && (
                  <a
                    className="btn btn-sm btn-light-primary btn-hover-primary"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onDeleteSourceBranch(); }}
                  >
                    Delete Source Branch
                  </a>
                )}
                {/* Restore Source Branch: can modify PR + can write code */}
                {isOpen && onRestoreSourceBranch && canModify && canWriteCode && (
                  <a
                    className="btn btn-sm btn-light-primary btn-hover-primary"
                    role="button"
                    onClick={(e) => { e.preventDefault(); onRestoreSourceBranch(); }}
                  >
                    Restore Source Branch
                  </a>
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
                className={`code-comments nav-link d-flex align-items-center${activeTab === "code-comments" ? " active" : ""}`}
              >
                Code Comments
              </Link>
            </li>
          </ul>

          {children}
        </div>

        {/* Sidebar */}
        {pr && sideInfoVisible && (
          <PullRequestMoreInfoPanel
            pr={pr}
            reviews={reviews}
            assignments={assignments}
            mergePreview={mergePreview}
            actionPending={actionPending}
            currentUser={currentUser}
            autoMergeEnabled={autoMergeEnabled}
            onMergeStrategyChange={onMergeStrategyChange}
            onRemoveReviewer={onRemoveReviewer}
            onRequestReviewAgain={onRequestReviewAgain}
            onAssignToMe={onAssignToMe}
            onSynchronize={onSynchronize}
            onDelete={onDelete}
            onAutoMergeChange={onAutoMergeChange}
            onChangeTargetBranch={onChangeTargetBranch}
            onUpdateSourceBranch={onUpdateSourceBranch}
            sourceBranchOutdated={sourceBranchOutdated}
            addReviewerSlot={addReviewerSlot}
            canModify={canModify}
            canWriteCode={canWriteCode}
          />
        )}
      </div>
    </div>
  );
}
