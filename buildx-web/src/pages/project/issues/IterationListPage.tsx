import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { QueryListLayout } from "../../../components/onedev/panels/QueryListLayout";
import type { ListToolbarAction } from "../../../components/onedev/panels/ResourcefulListPanel";
import {
  fetchProjectIterations,
  formatIterationDay,
  iterationStatus,
  type Iteration,
  type IterationStatus,
} from "../../../api/iterations";
import { buildProjectScopedHref } from "../../../data/queryPresets";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

const DEFAULT_TOOLBAR: ListToolbarAction[] = [
  { icon: "filter", label: "Filter", className: "opacity-50" },
  { icon: "sort", label: "Order By", className: "opacity-50" },
];

const STATUS_MAP: Record<IterationStatus, { className: string; label: string }> = {
  active: { className: "badge badge-light-primary", label: "Active" },
  upcoming: { className: "badge badge-light-warning", label: "Upcoming" },
  closed: { className: "badge badge-light-secondary", label: "Closed" },
};

function IterationStatusBadge({ iteration }: { iteration: Iteration }) {
  const status = iterationStatus(iteration);
  const { className, label } = STATUS_MAP[status];
  return <span className={className}>{label}</span>;
}

/**
 * Mirrors OneDev IterationListPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationListPage.html
 */
export function IterationListPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [queryInput, setQueryInput] = useState(query);

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  const { data: iterations, loading, error } = useAsyncResource(
    () => fetchProjectIterations(projectPath, { name: query || undefined }),
    [projectPath, query],
  );

  const filtered = useMemo(() => {
    const list = iterations ?? [];
    if (!query) {
      return list;
    }
    const lower = query.toLowerCase();
    return list.filter((iter) => iter.name.toLowerCase().includes(lower));
  }, [iterations, query]);

  function handleQueryChange(nextQuery: string) {
    setQueryInput(nextQuery);
    const next = new URLSearchParams(searchParams);
    if (nextQuery.trim()) {
      next.set("query", nextQuery.trim());
    } else {
      next.delete("query");
    }
    setSearchParams(next, { replace: true });
  }

  function handleQuerySubmit(e: FormEvent) {
    e.preventDefault();
    handleQueryChange(queryInput);
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Iterations">
      <div className="p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap"
          storageKey={`iterations:project:${projectPath}`}
          currentQuery={query}
          onSelectQuery={handleQueryChange}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~iterations`, q)}
        >
          {(savedQueries) => (
            <div className="card">
              <div className="card-body">
                <div className="d-flex mb-4">
                  <form
                    className="clearable-wrapper flex-grow-1"
                    onSubmit={handleQuerySubmit}
                  >
                    <div className="input-group">
                      <input
                        spellCheck={false}
                        className="form-control"
                        placeholder="Query/order iterations"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
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
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <div className="operations mb-4">
                  {[...savedQueries.toolbarActions, ...DEFAULT_TOOLBAR].map((action) => (
                    <a
                      key={action.label}
                      href={action.href ?? "#"}
                      className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
                      onClick={(e) => {
                        if (!action.href) {
                          e.preventDefault();
                        }
                        action.onClick?.();
                      }}
                    >
                      <Icon name={action.icon} /> {action.label}
                    </a>
                  ))}
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
                  <td className="text-muted">{formatIterationDay(iter.startDay)}</td>
                  <td className="text-muted">{formatIterationDay(iter.dueDay)}</td>
                  <td className="text-muted">{iter.scheduleCount ?? 0}</td>
                  <td>
                    <IterationStatusBadge iteration={iter} />
                  </td>
                </tr>
              ))}
            </tbody>
                </table>
                {!loading && filtered.length === 0 && (
                  <div className="text-muted text-center py-4">
                    No iterations found.
                  </div>
                )}
              </div>
            </div>
          )}
        </QueryListLayout>
      </div>
    </ProjectLayout>
  );
}
