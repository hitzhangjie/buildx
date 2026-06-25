import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { PullRequestDetailShell } from "../../../components/onedev/panels/PullRequestDetailShell";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import { usePullRequestDetail } from "../../../hooks/usePullRequestDetail";
import {
  addPullRequestReviewer,
  createPullRequestComment,
  deletePullRequest,
  deleteSourceBranch,
  discardPullRequest,
  fetchPullRequestAssignments,
  fetchPullRequestComments,
  mergePullRequest,
  removePullRequestReviewer,
  reopenPullRequest,
  restoreSourceBranch,
  reviewPullRequest,
  synchronizePullRequest,
  updatePullRequestDescription,
  updatePullRequestMergeStrategy,
  updatePullRequestTitle,
  type PullRequestAssignment,
  type PullRequestComment,
} from "../../../api/pullRequests";
import { fetchUsers } from "../../../api/users";
import { formatWhenISO } from "../../../util/time";

export function PullRequestActivitiesPage() {
  const { projectPath } = useProject();
  const { request } = useParams<{ request: string }>();
  const { pr, reviews, mergePreview, loading, error, reload, setError } = usePullRequestDetail(projectPath);
  const [comments, setComments] = useState<PullRequestComment[]>([]);
  const [assignments, setAssignments] = useState<PullRequestAssignment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [actionPending, setActionPending] = useState(false);
  const [reviewerQuery, setReviewerQuery] = useState("");
  const [reviewerOptions, setReviewerOptions] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (!pr) {
      setComments([]);
      setAssignments([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      fetchPullRequestComments(pr.id),
      fetchPullRequestAssignments(pr.id),
    ]).then(([commentList, assignmentList]) => {
      if (!cancelled) {
        setComments(commentList);
        setAssignments(assignmentList);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [pr]);

  async function runAction(action: () => Promise<void>) {
    setActionPending(true);
    try {
      await action();
      await reload();
      if (pr) {
        const [c, a] = await Promise.all([
          fetchPullRequestComments(pr.id),
          fetchPullRequestAssignments(pr.id),
        ]);
        setComments(c);
        setAssignments(a);
      }
    } catch (err) {
      setError((err as { message?: string }).message ?? "Action failed");
    } finally {
      setActionPending(false);
    }
  }

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
        // Lifecycle.
        onMerge={isOpen ? () => runAction(() => mergePullRequest(pr!.id)) : undefined}
        onDiscard={isOpen ? () => runAction(() => discardPullRequest(pr!.id)) : undefined}
        onReopen={pr?.status === "DISCARDED" ? () => runAction(() => reopenPullRequest(pr!.id)) : undefined}
        // Reviews.
        onApprove={isOpen ? () => runAction(() => reviewPullRequest(pr!.id, "APPROVED")) : undefined}
        onRequestChanges={isOpen ? () => runAction(() => reviewPullRequest(pr!.id, "REQUESTED_FOR_CHANGES")) : undefined}
        onRemoveReviewer={isOpen ? (userId) => runAction(() => removePullRequestReviewer(pr!.id, userId)) : undefined}
        onRequestReviewAgain={isOpen ? (userId) => runAction(() => addPullRequestReviewer(pr!.id, userId)) : undefined}
        // Merge strategy.
        onMergeStrategyChange={isOpen ? (strategy) => runAction(() => updatePullRequestMergeStrategy(pr!.id, strategy)) : undefined}
        // Title & description.
        onTitleChange={isOpen ? (title) => runAction(() => updatePullRequestTitle(pr!.id, title)) : undefined}
        onDescriptionChange={isOpen ? (desc) => runAction(() => updatePullRequestDescription(pr!.id, desc)) : undefined}
        // Source branch.
        onDeleteSourceBranch={isOpen ? () => runAction(() => deleteSourceBranch(pr!.id)) : undefined}
        onRestoreSourceBranch={isOpen ? () => runAction(() => restoreSourceBranch(pr!.id)) : undefined}
        // Sync.
        onSynchronize={isOpen ? () => runAction(() => synchronizePullRequest(pr!.id)) : undefined}
        // Delete PR.
        onDelete={() => runAction(async () => {
          await deletePullRequest(pr!.id);
          window.location.href = `/${projectPath}/~pulls`;
        })}
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
        {/* Comments timeline */}
        <div className="activities-list">
          {comments.map((comment) => (
            <div key={comment.id} className="card card-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center mb-2">
                  <Icon name="user" />
                  <strong className="ml-1 mr-2">{comment.user?.name ?? "Unknown"}</strong>
                  <span className="text-muted font-size-sm">{formatWhenISO(comment.createDate)}</span>
                </div>
                <div className="comment-content">{comment.content}</div>
              </div>
            </div>
          ))}
          {!comments.length && !loading && (
            <div className="text-muted text-center py-4">No activities yet</div>
          )}
        </div>

        {/* Comment input */}
        {isOpen && (
          <div className="mt-4">
            <label className="form-label" htmlFor="newComment">
              Add a comment
            </label>
            <textarea
              id="newComment"
              className="form-control mb-2"
              rows={3}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Leave a comment"
            />
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleAddComment}
              disabled={!newComment.trim() || actionPending}
            >
              <Icon name="comment" /> Comment
            </button>
          </div>
        )}
      </PullRequestDetailShell>
    </ProjectLayout>
  );
}
