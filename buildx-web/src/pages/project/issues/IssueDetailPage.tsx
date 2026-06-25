import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  createIssueComment,
  fetchIssueByNumber,
  fetchIssueComments,
  formatIssueDate,
  type Issue,
  type IssueComment,
} from "../../../api/issues";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { IssueDetailShell } from "./IssueDetailShell";

/**
 * Issue detail — Activities tab (default).
 * Mirrors OneDev IssueActivitiesPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueActivitiesPage.html
 */
export function IssueDetailPage() {
  const { projectPath } = useProject();
  const { issue: issueParam } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issueParam ?? "0", 10);

  // Filters for activity types
  const [showComments, setShowComments] = useState(true);
  const [showChangeHistory, setShowChangeHistory] = useState(true);

  const [newComment, setNewComment] = useState("");
  const [commentError, setCommentError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [commentRefresh, setCommentRefresh] = useState(0);

  const { data: issue } = useAsyncResource<Issue | null>(
    () => fetchIssueByNumber(projectPath, issueNumber),
    [projectPath, issueNumber],
  );

  const {
    data: comments,
    loading: commentsLoading,
    error: commentsError,
  } = useAsyncResource<IssueComment[]>(
    async () => {
      if (!issue) return [];
      return fetchIssueComments(issue.id);
    },
    [issue?.id, commentRefresh],
  );

  async function handleCommentSubmit() {
    if (!issue || !newComment.trim()) return;
    setSubmitting(true);
    setCommentError(null);
    try {
      await createIssueComment(issue.id, newComment.trim());
      setNewComment("");
      setCommentRefresh((n) => n + 1);
    } catch (err) {
      setCommentError((err as { message?: string }).message ?? "Failed to post comment");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <IssueDetailShell activeTab="activities">
      {/* Activity filter toggles — matching OneDev optionsFrag */}
      <div className="d-flex align-items-center mb-4">
        <div className="btn-group">
          <button
            type="button"
            className={`btn btn-xs text-muted btn-outline-secondary ${showComments ? "active" : ""}`}
            title="Toggle comments"
            onClick={() => setShowComments((v) => !v)}
          >
            Comments
          </button>
          <button
            type="button"
            className={`btn btn-xs text-muted btn-outline-secondary ${showChangeHistory ? "active" : ""}`}
            title="Toggle change history"
            onClick={() => setShowChangeHistory((v) => !v)}
          >
            History
          </button>
        </div>
      </div>

      {/* Activities list */}
      <ul className="issue-activities list-unstyled mb-0">
        {commentsLoading && (
          <li className="text-muted mb-3">Loading comments...</li>
        )}
        {commentsError && (
          <li className="alert alert-danger" role="alert">
            {commentsError}
          </li>
        )}

        {/* Comments */}
        {showComments &&
          (comments ?? []).map((comment) => (
            <li key={comment.id} className="activity">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div className="d-flex align-items-center">
                  <img
                    src={`/~avatar/${comment.user?.name ?? "default"}`}
                    alt=""
                    style={{ width: 32, height: 32, borderRadius: "50%" }}
                    className="mr-2"
                  />
                  <div>
                    <span className="font-weight-bold">
                      {comment.user?.name ?? "unknown"}
                    </span>
                    <span className="text-muted ml-2 font-size-sm">
                      commented {formatIssueDate(comment.createDate)}
                    </span>
                  </div>
                </div>
                {comment.revisionCount > 1 && (
                  <span className="text-muted font-size-xs">
                    edited
                  </span>
                )}
              </div>
              <div className="white-space-pre-wrap ml-5 pl-2">
                {comment.content}
              </div>
            </li>
          ))}

        {/* Change history — stub */}
        {showChangeHistory && (
          <li className="activity text-muted font-size-sm">
            Change history not yet implemented.
          </li>
        )}

        {/* Add comment form */}
        {issue && (
          <li className="mt-4">
            <form
              className="add-comment"
              onSubmit={(e) => {
                e.preventDefault();
                void handleCommentSubmit();
              }}
            >
              {commentError && (
                <div className="alert alert-danger py-2" role="alert">
                  {commentError}
                </div>
              )}
              <textarea
                className="form-control mb-3"
                rows={4}
                placeholder="Leave a comment"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={!newComment.trim() || submitting}
              >
                {submitting ? "Posting..." : "Comment"}
              </button>
            </form>
          </li>
        )}
      </ul>
    </IssueDetailShell>
  );
}
