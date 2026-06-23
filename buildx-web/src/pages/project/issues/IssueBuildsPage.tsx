import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface MockBuild {
  id: number;
  number: number;
  jobName: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "CANCELLED" | "PENDING";
  branch: string;
  date: string;
}

const MOCK_BUILDS: MockBuild[] = [
  {
    id: 1,
    number: 105,
    jobName: "CI Pipeline",
    status: "SUCCESSFUL",
    branch: "main",
    date: "2026-06-22 14:30",
  },
  {
    id: 2,
    number: 104,
    jobName: "CI Pipeline",
    status: "FAILED",
    branch: "fix/issue-state-machine",
    date: "2026-06-22 11:00",
  },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  SUCCESSFUL: "badge-light-success",
  FAILED: "badge-light-danger",
  RUNNING: "badge-light-info",
  CANCELLED: "badge-light-secondary",
  PENDING: "badge-light-warning",
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
 * Mirrors OneDev IssueBuildsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueBuildsPage.html
 */
export function IssueBuildsPage() {
  const { projectPath } = useProject();
  const { issue } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issue ?? "0", 10);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`Issue #${issueNumber} - Builds`}
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">Issue #{issueNumber}</h4>
            <span className="badge badge-light-warning font-size-sm">Open</span>
          </div>

          <TabNav
            activeTab="builds"
            projectPath={projectPath}
            issueNumber={issueNumber}
          />

          <table className="table">
            <thead>
              <tr>
                <th>Build</th>
                <th>Status</th>
                <th>Branch</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BUILDS.map((build) => (
                <tr key={build.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~builds/${build.number}`}
                      className="font-weight-bold"
                    >
                      {build.jobName} #{build.number}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-sm font-size-xs ${STATUS_BADGE_CLASS[build.status]}`}>
                      {build.status}
                    </span>
                  </td>
                  <td className="text-muted font-size-sm">
                    <Icon name="branch" /> {build.branch}
                  </td>
                  <td className="text-muted">{build.date}</td>
                </tr>
              ))}
              {MOCK_BUILDS.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-5">
                    No builds found
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
