import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface MockIssue {
  id: number;
  number: number;
  title: string;
  state: string;
  stateColor: string;
  assignee: string;
}

const MOCK_ITERATION = {
  id: 1,
  name: "Sprint 2",
  startDate: "2026-06-15",
  dueDate: "2026-06-28",
  status: "active" as const,
};

const MOCK_ISSUES: MockIssue[] = [
  {
    id: 1,
    number: 5,
    title: "Add user authentication",
    state: "Open",
    stateColor: "badge-light-warning",
    assignee: "admin",
  },
  {
    id: 2,
    number: 6,
    title: "Setup CI/CD pipeline",
    state: "In Progress",
    stateColor: "badge-light-info",
    assignee: "dev",
  },
  {
    id: 3,
    number: 7,
    title: "Write API documentation",
    state: "Closed",
    stateColor: "badge-light-success",
    assignee: "admin",
  },
];

const TABS = [
  { id: "issues", label: "Issues", href: "" },
  { id: "burndown", label: "Burndown", href: "/burndown" },
  { id: "edit", label: "Edit", href: "/edit" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  iterationId,
}: {
  activeTab: string;
  projectPath: string;
  iterationId: number;
}) {
  const base = `/${projectPath}/~iterations/${iterationId}`;

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
 * Mirrors OneDev IterationIssuesPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationIssuesPage.html
 */
export function IterationIssuesPage() {
  const { projectPath } = useProject();
  const { iterationId } = useParams<{ iterationId: string }>();
  const id = parseInt(iterationId ?? "0", 10);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`${MOCK_ITERATION.name} - Issues`}
    >
      <div className="card m-3">
        <div className="card-body">
          {/* Iteration Header */}
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">{MOCK_ITERATION.name}</h4>
            <span className="badge badge-light-primary font-size-sm">
              {MOCK_ITERATION.status.charAt(0).toUpperCase() + MOCK_ITERATION.status.slice(1)}
            </span>
          </div>
          <div className="text-muted font-size-sm mb-4 d-flex align-items-center flex-wrap">
            <Icon name="calendar" />
            <span className="ml-1 mr-3">
              {MOCK_ITERATION.startDate} &rarr; {MOCK_ITERATION.dueDate}
            </span>
            <span className="mx-1">|</span>
            <Link
              to={`/${projectPath}/~iterations/${id}/burndown`}
              className="ml-1 text-muted"
            >
              <Icon name="chart" /> Burndown
            </Link>
          </div>

          <TabNav activeTab="issues" projectPath={projectPath} iterationId={id} />

          <table className="table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>State</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_ISSUES.map((issue) => (
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
                  <td className="text-muted">
                    <Icon name="user" /> {issue.assignee}
                  </td>
                </tr>
              ))}
              {MOCK_ISSUES.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">
                    No issues in this iteration
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
