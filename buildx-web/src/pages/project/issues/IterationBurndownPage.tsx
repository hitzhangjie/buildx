import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

const MOCK_ITERATION = {
  id: 1,
  name: "Sprint 2",
  startDate: "2026-06-15",
  dueDate: "2026-06-28",
  status: "active" as const,
};

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
 * Mirrors OneDev IterationBurndownPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationBurndownPage.html
 */
export function IterationBurndownPage() {
  const { projectPath } = useProject();
  const { iterationId } = useParams<{ iterationId: string }>();
  const id = parseInt(iterationId ?? "0", 10);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`${MOCK_ITERATION.name} - Burndown`}
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
          <div className="text-muted font-size-sm mb-4">
            <Icon name="calendar" />
            <span className="ml-1">
              {MOCK_ITERATION.startDate} &rarr; {MOCK_ITERATION.dueDate}
            </span>
          </div>

          <TabNav activeTab="burndown" projectPath={projectPath} iterationId={id} />

          {/* Burndown Chart Placeholder */}
          <div className="card">
            <div className="card-body text-center py-5">
              <div className="text-muted mb-3">
                <Icon name="chart" width={48} height={48} />
              </div>
              <h5 className="text-muted">Burndown chart will be displayed here</h5>
              <p className="text-muted font-size-sm mt-2">
                Track progress of issue completion over the iteration timeline.
              </p>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
