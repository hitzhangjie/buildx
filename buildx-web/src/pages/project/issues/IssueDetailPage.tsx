import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

type TabId = "activities" | "commits" | "pulls" | "builds";

interface Comment {
  id: number;
  author: string;
  date: string;
  content: string;
}

const MOCK_ISSUE = {
  number: 1,
  title: "Setup CI pipeline",
  state: "Open",
  stateColor: "light-warning" as const,
  author: "admin",
  date: "2026-06-20",
  description:
    "We need to set up a CI pipeline for automated builds and tests on every push to the main branch.",
};

const MOCK_COMMENTS: Comment[] = [
  {
    id: 1,
    author: "alice",
    date: "2026-06-21",
    content:
      "I can help with the GitHub Actions workflow configuration.",
  },
  {
    id: 2,
    author: "bob",
    date: "2026-06-22",
    content:
      "Let's use the existing buildx build system. It already supports multiple environments.",
  },
];

const TABS: { id: TabId; label: string; href: string }[] = [
  { id: "activities", label: "Activities", href: "" },
  { id: "commits", label: "Commits", href: "/commits" },
  { id: "pulls", label: "Pull Requests", href: "/pulls" },
  { id: "builds", label: "Builds", href: "/builds" },
];

function TabNav({
  activeTab,
  projectPath,
  issueNumber,
}: {
  activeTab: TabId;
  projectPath: string;
  issueNumber: number;
}) {
  const base = `/${projectPath}/~issues/${issueNumber}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mirrors OneDev IssueDetailPage (activities tab).
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueDetailPage.html
 */
export function IssueDetailPage() {
  const { projectPath } = useProject();
  const { issue } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issue ?? "0", 10);

  const [activeTab] = useState<TabId>("activities");
  const [newComment, setNewComment] = useState("");

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`#${issueNumber} ${MOCK_ISSUE.title}`}
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">
              #{issueNumber} {MOCK_ISSUE.title}
            </h4>
            <span
              className={`badge badge-${MOCK_ISSUE.stateColor} font-size-sm`}
            >
              {MOCK_ISSUE.state}
            </span>
          </div>
          <div className="text-muted font-size-sm mb-4">
            <span className="mr-3">
              <Icon name="user" /> {MOCK_ISSUE.author}
            </span>
            <span>{MOCK_ISSUE.date}</span>
          </div>
          <div className="mb-4 p-3 bg-light rounded">
            {MOCK_ISSUE.description}
          </div>

          <TabNav
            activeTab={activeTab}
            projectPath={projectPath}
            issueNumber={issueNumber}
          />

          {activeTab === "activities" && (
            <div>
              <h5 className="mb-3">Comments</h5>
              {MOCK_COMMENTS.map((comment) => (
                <div key={comment.id} className="card mb-3">
                  <div className="card-body">
                    <div className="d-flex justify-content-between text-muted font-size-sm mb-2">
                      <span className="font-weight-bold">
                        {comment.author}
                      </span>
                      <span>{comment.date}</span>
                    </div>
                    <div>{comment.content}</div>
                  </div>
                </div>
              ))}
              <div className="mt-4">
                <h6 className="mb-2">Add a comment</h6>
                <textarea
                  className="form-control mb-2"
                  rows={4}
                  placeholder="Write a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <button
                  type="button"
                  className="btn btn-primary font-weight-bold"
                  disabled={!newComment.trim()}
                >
                  Comment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
