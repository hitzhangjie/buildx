import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface MockPullRequest {
  id: number;
  number: number;
  title: string;
  status: "Open" | "Merged" | "Discarded";
  sourceBranch: string;
  targetBranch: string;
  author: string;
}

const MOCK_PRS: MockPullRequest[] = [];

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-light-warning",
  Merged: "badge-light-success",
  Discarded: "badge-light-danger",
};

const TABS = [
  { id: "activities", label: "Activities", href: "" },
  { id: "commits", label: "Commits", href: "/commits" },
  { id: "pulls", label: "Pull Requests", href: "/pulls" },
  { id: "builds", label: "Builds", href: "/builds" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  issueNumber,
}: {
  activeTab: string;
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
 * Mirrors OneDev IssuePullRequestsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssuePullRequestsPage.html
 */
export function IssuePullRequestsPage() {
  const { projectPath } = useProject();
  const { issue } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issue ?? "0", 10);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`Issue #${issueNumber} - Pull Requests`}
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">Issue #{issueNumber}</h4>
            <span className="badge badge-light-warning font-size-sm">Open</span>
          </div>

          <TabNav
            activeTab="pulls"
            projectPath={projectPath}
            issueNumber={issueNumber}
          />

          <table className="table">
            <thead>
              <tr>
                <th>Pull Request</th>
                <th>Status</th>
                <th>Branches</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_PRS.map((pr) => (
                <tr key={pr.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~pulls/${pr.number}`}
                      className="font-weight-bold"
                    >
                      {pr.title}
                    </Link>
                    <span className="text-muted ml-1">#{pr.number}</span>
                  </td>
                  <td>
                    <span className={`badge badge-sm font-size-xs ${STATUS_BADGE_CLASS[pr.status]}`}>
                      {pr.status}
                    </span>
                  </td>
                  <td className="text-muted font-size-sm">
                    <Icon name="branch" />
                    <span className="mx-1">{pr.sourceBranch}</span>
                    <span className="mx-1">&rarr;</span>
                    <span className="mx-1">{pr.targetBranch}</span>
                  </td>
                  <td className="text-muted">
                    <Icon name="user" /> {pr.author}
                  </td>
                </tr>
              ))}
              {MOCK_PRS.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">
                    No pull requests found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
