import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface MockComment {
  id: number;
  author: string;
  date: string;
  content: string;
}

const MOCK_COMMENTS: MockComment[] = [];

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-light-warning",
  Merged: "badge-light-success",
  Discarded: "badge-light-danger",
};

export function PullRequestActivitiesPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();
  const [comments] = useState<MockComment[]>(MOCK_COMMENTS);
  const [newComment, setNewComment] = useState("");

  // TODO: Fetch PR detail from API
  const prTitle = "";
  const prStatus = "";
  const sourceBranch = "";
  const targetBranch = "";
  const submitter = "";
  const createdAt = "";

  function handleAddComment() {
    if (!newComment.trim()) return;
    // Mock — in real app this would call the API
    setNewComment("");
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          {/* PR Header */}
          <div className="mb-4">
            <div className="d-flex align-items-center flex-wrap mb-2">
              <h4 className="mb-0 mr-3">{prTitle}</h4>
              <span className={`badge font-size-sm mr-2 ${STATUS_BADGE_CLASS[prStatus]}`}>
                {prStatus}
              </span>
              <span className="text-muted">#{number}</span>
            </div>
            <div className="text-muted font-size-sm d-flex align-items-center flex-wrap">
              <Icon name="branch" />
              <span className="mx-1">{sourceBranch}</span>
              <span className="mx-1">&rarr;</span>
              <span className="mx-1">{targetBranch}</span>
              <span className="mx-2">|</span>
              <Icon name="user" />
              <span className="ml-1">{submitter}</span>
              <span className="mx-2">|</span>
              <Icon name="calendar" />
              <span className="ml-1">{createdAt}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}`}
                className="nav-link active"
              >
                Activities
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}/changes`}
                className="nav-link"
              >
                Changes
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}/code-comments`}
                className="nav-link"
              >
                Code Comments
              </Link>
            </li>
          </ul>

          {/* Comments / Activities */}
          <div className="activities-list">
            {comments.map((comment) => (
              <div key={comment.id} className="card card-sm mb-3">
                <div className="card-body">
                  <div className="d-flex align-items-center mb-2">
                    <Icon name="user" />
                    <strong className="ml-1 mr-2">{comment.author}</strong>
                    <span className="text-muted font-size-sm">{comment.date}</span>
                  </div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              </div>
            ))}
          </div>

          {/* New Comment */}
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
              disabled={!newComment.trim()}
            >
              <Icon name="comment" /> Comment
            </button>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
