import { Link, useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface MockFixedIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  stateColor: string;
}

const MOCK_FIXED_ISSUES: MockFixedIssue[] = [
  {
    id: 1,
    number: 5,
    title: "Fix login redirect after authentication",
    state: "Closed",
    stateColor: "badge-light-success",
  },
  {
    id: 2,
    number: 8,
    title: "Resolve database connection timeout on startup",
    state: "Closed",
    stateColor: "badge-light-success",
  },
];

const TABS = [
  { id: "dashboard", label: "Dashboard", href: "" },
  { id: "pipeline", label: "Pipeline", href: "/pipeline" },
  { id: "log", label: "Log", href: "/log" },
  { id: "changes", label: "Changes", href: "/changes" },
  { id: "fixed-issues", label: "Fixed Issues", href: "/fixed-issues" },
  { id: "artifacts", label: "Artifacts", href: "/artifacts" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  buildNumber,
}: {
  activeTab: string;
  projectPath: string;
  buildNumber: number;
}) {
  const base = `/${projectPath}/~builds/${buildNumber}`;

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
 * Mirrors OneDev FixedIssuesPage.
 * Reference: references/onedev/.../web/page/project/builds/detail/FixedIssuesPage.html
 */
export function FixedIssuesPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();
  const buildNumber = parseInt(number ?? "0", 10);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${buildNumber} - Fixed Issues`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Build Info Header */}
          <div className="mb-4">
            <h4 className="mb-0">Build #{buildNumber}</h4>
          </div>

          <TabNav activeTab="fixed-issues" projectPath={projectPath} buildNumber={buildNumber} />

          <table className="table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FIXED_ISSUES.map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~issues/${issue.number}`}
                      className="font-weight-bold"
                    >
                      #{issue.number} {issue.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-sm font-size-xs ${issue.stateColor}`}>
                      {issue.state}
                    </span>
                  </td>
                </tr>
              ))}
              {MOCK_FIXED_ISSUES.length === 0 && (
                <tr>
                  <td colSpan={2} className="text-center text-muted py-5">
                    No fixed issues
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
