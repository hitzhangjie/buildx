import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface Commit {
  id: number;
  message: string;
  sha: string;
  author: string;
  date: string;
}

const commits: Commit[] = [];

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
 * Mirrors OneDev IssueCommitsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueCommitsPage.html
 */
export function IssueCommitsPage() {
  const { projectPath } = useProject();
  const { issue } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issue ?? "0", 10);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`Issue #${issueNumber} - Commits`}
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">Issue #{issueNumber}</h4>
            <span className="badge badge-light-warning font-size-sm">Open</span>
          </div>

          <TabNav
            activeTab="commits"
            projectPath={projectPath}
            issueNumber={issueNumber}
          />

          <table className="table">
            <thead>
              <tr>
                <th>Message</th>
                <th>Author</th>
                <th>Date</th>
                <th>SHA</th>
              </tr>
            </thead>
            <tbody>
              {commits.map((commit) => (
                <tr key={commit.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~commits/${commit.sha}`}
                      className="font-weight-bold"
                    >
                      {commit.message}
                    </Link>
                  </td>
                  <td className="text-muted">
                    <Icon name="user" /> {commit.author}
                  </td>
                  <td className="text-muted">{commit.date}</td>
                  <td>
                    <span className="badge badge-light-secondary font-size-xs">
                      <code>{commit.sha}</code>
                    </span>
                  </td>
                </tr>
              ))}
              {commits.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">
                    No commits found
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
