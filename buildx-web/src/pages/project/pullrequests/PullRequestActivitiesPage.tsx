import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { PullRequestDetailShell } from "../../../components/onedev/panels/PullRequestDetailShell";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";
import { usePullRequestDetail } from "../../../hooks/usePullRequestDetail";
import {
  addPullRequestReviewer,
  changeTargetBranch,
  createPullRequestComment,
  deletePullRequest,
  deleteSourceBranch,
  discardPullRequest,
  fetchPullRequestComments,
  mergePullRequest,
  removePullRequestReviewer,
  reopenPullRequest,
  restoreSourceBranch,
  reviewPullRequest,
  setAutoMerge,
  synchronizePullRequest,
  updatePullRequestDescription,
  updatePullRequestMergeStrategy,
  updatePullRequestTitle,
  updateSourceBranch,
  type PullRequestComment,
} from "../../../api/pullRequests";
import { fetchUsers } from "../../../api/users";
import { formatWhenISO } from "../../../util/time";

export function PullRequestActivitiesPage() {
  const { projectPath, params } = useProject();
  const { user: currentUser } = useAuth();
  const request = params.request as string | undefined;
  const { pr, reviews, assignments, mergePreview, loading, error, reload, setError } =
    usePullRequestDetail(projectPath);
  const [comments, setComments] = useState<PullRequestComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [reviewerQuery, setReviewerQuery] = useState("");
  const [reviewerOptions, setReviewerOptions] = useState<Array<{ id: number; name: string }>>([]);

  // Filter toggles (matching OneDev cookie-persisted toggles)
  const [showComments, setShowComments] = useState(true);
  const [showCommits, setShowCommits] = useState(true);
  const [showChangeHistory, setShowChangeHistory] = useState(true);

  // Auto merge state
  const [autoMergeEnabled, setAutoMergeEnabled] = useState(false);

  useEffect(() => {
    if (!pr) {
      setComments([]);
      return;
    }
    let cancelled = false;
    fetchPullRequestComments(pr.id).then((commentList) => {
      if (!cancelled) {
        setComments(commentList);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pr]);

  const runAction = useCallback(
    async (action: () => Promise<void>) => {
      setActionPending(true);
      try {
        await action();
        await reload();
        if (pr) {
          const c = await fetchPullRequestComments(pr.id);
          setComments(c);
        }
      } catch (err) {
        setError((err as { message?: string }).message ?? "Action failed");
      } finally {
        setActionPending(false);
      }
    },
    [pr, reload, setError],
  );

  async function handleAddComment() {
    if (!pr || !newComment.trim()) return;
    setActionPending(true);
    try {
      const created = await createPullRequestComment(pr.id, newComment.trim());
      setComments((prev) => [...prev, created]);
      setNewComment("");
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to add comment");
    } finally {
      setActionPending(false);
    }
  }

  async function searchReviewers(q: string) {
    setReviewerQuery(q);
    if (!q.trim()) {
      setReviewerOptions([]);
      return;
    }
    const users = await fetchUsers(q);
    const existing = new Set(reviews.map((r) => r.user?.id));
    setReviewerOptions(
      users
        .filter((u) => !existing.has(u.id) && u.id !== pr?.submitter?.id)
        .map((u) => ({ id: u.id, name: u.name })),
    );
  }

  const isOpen = pr?.status === "OPEN";

  // Assign to me handler: add current user as reviewer/assignee
  const handleAssignToMe =
    currentUser && isOpen
      ? () =>
          runAction(async () => {
            await addPullRequestReviewer(pr!.id, currentUser.id);
          })
      : undefined;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${request}`}>
      <PullRequestDetailShell
        projectPath={projectPath}
        requestNumber={request ?? ""}
        pr={pr}
        reviews={reviews}
        assignments={assignments}
        activeTab="activities"
        mergePreview={mergePreview}
        loading={loading}
        error={error}
        actionPending={actionPending}
        currentUser={currentUser}
        autoMergeEnabled={autoMergeEnabled}
        // Lifecycle.
        onMerge={isOpen ? () => runAction(() => mergePullRequest(pr!.id)) : undefined}
        onDiscard={isOpen ? () => runAction(() => discardPullRequest(pr!.id)) : undefined}
        onReopen={
          pr?.status === "DISCARDED" ? () => runAction(() => reopenPullRequest(pr!.id)) : undefined
        }
        // Reviews.
        onApprove={
          isOpen ? () => runAction(() => reviewPullRequest(pr!.id, "APPROVED")) : undefined
        }
        onRequestChanges={
          isOpen
            ? () => runAction(() => reviewPullRequest(pr!.id, "REQUESTED_FOR_CHANGES"))
            : undefined
        }
        onRemoveReviewer={
          isOpen
            ? (userId) => runAction(() => removePullRequestReviewer(pr!.id, userId))
            : undefined
        }
        onRequestReviewAgain={
          isOpen
            ? (userId) => runAction(() => addPullRequestReviewer(pr!.id, userId))
            : undefined
        }
        // Merge strategy.
        onMergeStrategyChange={
          isOpen
            ? (strategy) => runAction(() => updatePullRequestMergeStrategy(pr!.id, strategy))
            : undefined
        }
        // Title & description.
        onTitleChange={
          isOpen ? (title) => runAction(() => updatePullRequestTitle(pr!.id, title)) : undefined
        }
        onDescriptionChange={
          isOpen
            ? (desc) => runAction(() => updatePullRequestDescription(pr!.id, desc))
            : undefined
        }
        // Source branch.
        onDeleteSourceBranch={
          isOpen ? () => runAction(() => deleteSourceBranch(pr!.id)) : undefined
        }
        onRestoreSourceBranch={
          isOpen ? () => runAction(() => restoreSourceBranch(pr!.id)) : undefined
        }
        // Update source branch.
        onUpdateSourceBranch={
          isOpen
            ? (method) => runAction(() => updateSourceBranch(pr!.id, method))
            : undefined
        }
        // Sidebar actions.
        onSynchronize={
          isOpen ? () => runAction(() => synchronizePullRequest(pr!.id)) : undefined
        }
        onAutoMergeChange={
          isOpen
            ? (enabled) =>
                runAction(async () => {
                  await setAutoMerge(pr!.id, enabled);
                  setAutoMergeEnabled(enabled);
                })
            : undefined
        }
        onAssignToMe={handleAssignToMe}
        // Delete PR.
        onDelete={() =>
          runAction(async () => {
            await deletePullRequest(pr!.id);
            window.location.href = `/${projectPath}/~pulls`;
          })
        }
        // Target branch change.
        onChangeTargetBranch={
          isOpen
            ? (branch) => runAction(() => changeTargetBranch(pr!.id, branch))
            : undefined
        }
        // Reviewer adder.
        addReviewerSlot={
          isOpen ? (
            <div>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Add reviewer"
                value={reviewerQuery}
                onChange={(e) => void searchReviewers(e.target.value)}
              />
              {reviewerOptions.length > 0 && (
                <div className="list-group mt-1">
                  {reviewerOptions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className="list-group-item list-group-item-action py-1"
                      onClick={() =>
                        void runAction(async () => {
                          await addPullRequestReviewer(pr!.id, u.id);
                          setReviewerQuery("");
                          setReviewerOptions([]);
                        })
                      }
                    >
                      {u.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : undefined
        }
      >
        {/* Activities list */}
        <ul className="activities list-unstyled mb-0">
          {/* Filter options */}
          <li className="activity options d-flex align-items-center mb-3">
            <div className="btn-group">
              <a
                className={`btn btn-xs text-muted btn-outline-secondary btn-active-secondary btn-icon${showComments ? " active" : ""}`}
                title="Toggle comments"
                onClick={(e) => {
                  e.preventDefault();
                  setShowComments((v) => !v);
                }}
              >
                <Icon name="comments" />
              </a>
              <a
                className={`btn btn-xs text-muted btn-outline-secondary btn-active-secondary btn-icon${showCommits ? " active" : ""}`}
                title="Toggle commits"
                onClick={(e) => {
                  e.preventDefault();
                  setShowCommits((v) => !v);
                }}
              >
                <Icon name="commit" />
              </a>
              <a
                className={`btn btn-xs text-muted btn-outline-secondary btn-active-secondary btn-icon${showChangeHistory ? " active" : ""}`}
                title="Toggle change history"
                onClick={(e) => {
                  e.preventDefault();
                  setShowChangeHistory((v) => !v);
                }}
              >
                <Icon name="history" />
              </a>
            </div>
          </li>

          {/* Comments */}
          {showComments &&
            comments.map((comment) => (
              <li key={comment.id} className="activity comment">
                <div className="d-flex">
                  <img
                    className="avatar mr-3 flex-shrink-0"
                    src="/~img/default-avatar.png"
                    alt=""
                  />
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-2">
                      <strong className="mr-2">{comment.user?.name ?? "Unknown"}</strong>
                      <span className="text-muted font-size-sm">
                        {formatWhenISO(comment.createDate)}
                      </span>
                    </div>
                    <div className="comment-content">{comment.content}</div>
                  </div>
                </div>
              </li>
            ))}

          {/* Empty state */}
          {!comments.length && !loading && (
            <li className="activity">
              <div className="text-muted text-center py-4">No activities yet</div>
            </li>
          )}
        </ul>

        {/* Comment input */}
        <div className="mt-4">
          {currentUser ? (
            <form
              className="add-comment leave-confirm no-autofocus"
              onSubmit={(e) => {
                e.preventDefault();
                handleAddComment();
              }}
            >
              <div className="mb-2">
                <label className="form-label" htmlFor="newComment">
                  Add a comment
                </label>
                <textarea
                  id="newComment"
                  className="form-control"
                  rows={3}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Leave a comment"
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary dirty-aware"
                disabled={!newComment.trim() || actionPending}
              >
                Comment
              </button>
            </form>
          ) : (
            <div className="login-to-comment alert alert-light text-center font-size-h6">
              <Link
                to={`/~login?redirect=${encodeURIComponent(window.location.pathname)}`}
                className="link-primary"
              >
                Login to comment
              </Link>
            </div>
          )}
        </div>
      </PullRequestDetailShell>
    </ProjectLayout>
  );
}
