import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface Iteration {
  id: number;
  name: string;
  startDate: string;
  dueDate: string;
  issuesCount: number;
  status: "active" | "upcoming" | "closed";
}

const MOCK_ITERATIONS: Iteration[] = [
  {
    id: 1,
    name: "Sprint 1",
    startDate: "2026-06-01",
    dueDate: "2026-06-14",
    issuesCount: 8,
    status: "closed",
  },
  {
    id: 2,
    name: "Sprint 2",
    startDate: "2026-06-15",
    dueDate: "2026-06-28",
    issuesCount: 5,
    status: "active",
  },
  {
    id: 3,
    name: "Sprint 3",
    startDate: "2026-06-29",
    dueDate: "2026-07-12",
    issuesCount: 0,
    status: "upcoming",
  },
];

const STATUS_MAP: Record<
  Iteration["status"],
  { className: string; label: string }
> = {
  active: { className: "badge badge-light-primary", label: "Active" },
  upcoming: { className: "badge badge-light-warning", label: "Upcoming" },
  closed: { className: "badge badge-light-secondary", label: "Closed" },
};

function IterationStatusBadge({ status }: { status: Iteration["status"] }) {
  const { className, label } = STATUS_MAP[status];
  return <span className={className}>{label}</span>;
}

/**
 * Mirrors OneDev IterationListPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationListPage.html
 */
export function IterationListPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  const filtered = MOCK_ITERATIONS.filter(
    (iter) =>
      !query || iter.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Iterations">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form
              className="clearable-wrapper flex-grow-1"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="input-group">
                <input
                  spellCheck={false}
                  className="form-control"
                  placeholder="Query/order iterations"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="input-group-append">
                  <button
                    type="submit"
                    className="btn btn-outline-secondary btn-icon"
                    title="Query"
                  >
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </form>
            <Link
              to={`/${projectPath}/~iterations/new`}
              className="btn btn-primary ml-3 font-weight-bold"
            >
              <Icon name="plus" /> New iteration
            </Link>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Issues</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((iter) => (
                <tr key={iter.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~iterations/${iter.id}`}
                      className="font-weight-bold"
                    >
                      {iter.name}
                    </Link>
                  </td>
                  <td className="text-muted">{iter.startDate}</td>
                  <td className="text-muted">{iter.dueDate}</td>
                  <td className="text-muted">{iter.issuesCount}</td>
                  <td>
                    <IterationStatusBadge status={iter.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-muted text-center py-4">
              No iterations found.
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
