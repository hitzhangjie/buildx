import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { QueryListLayout } from "../../../components/onedev/panels/QueryListLayout";
import type { ListToolbarAction } from "../../../components/onedev/panels/ResourcefulListPanel";
import {
  fetchProjectIssues,
  formatIssueDate,
  stateBadgeColor,
  type Issue,
} from "../../../api/issues";
import { buildProjectScopedHref } from "../../../data/queryPresets";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

const DEFAULT_TOOLBAR: ListToolbarAction[] = [
  { icon: "filter", label: "Filter", className: "opacity-50" },
  { icon: "sort", label: "Order By", className: "opacity-50" },
  { icon: "cog", label: "Operations", className: "opacity-50" },
];

/**
 * Mirrors OneDev ProjectIssueListPage.
 * Reference: references/onedev/.../web/page/project/issues/list/ProjectIssueListPage.html
 */
export function ProjectIssueListPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [queryInput, setQueryInput] = useState(query);

  useEffect(() => {
    setQueryInput(query);
  }, [query]);

  const { data: issues, loading, error } = useAsyncResource(
    () => fetchProjectIssues(projectPath, query),
    [projectPath, query],
  );

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

  const filtered = issues ?? [];

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Issues">
      <div className="d-flex flex-grow-1 p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap flex-grow-1"
          storageKey={`issues:project:${projectPath}`}
          currentQuery={query}
          onSelectQuery={handleQueryChange}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~issues`, q)}
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
                        placeholder="Query/order issues"
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
                    to={`/${projectPath}/~issues/new`}
                    className="btn btn-primary ml-3 font-weight-bold"
                  >
                    <Icon name="plus" /> Create new issue
                  </Link>
                </div>
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}
                <div className="operations mb-5">
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
                  <span className="float-right text-gray">
                    {loading ? "…" : filtered.length}
                  </span>
                </div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Issue</th>
                      <th>State</th>
                      <th>Votes</th>
                      <th>Comments</th>
                      <th>Submitter</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((issue) => (
                      <IssueRow key={issue.id} issue={issue} projectPath={projectPath} />
                    ))}
                  </tbody>
                </table>
                {!loading && filtered.length === 0 && (
                  <div className="text-muted text-center py-4">
                    No issues match your query.
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

function IssueRow({ issue, projectPath }: { issue: Issue; projectPath: string }) {
  return (
    <tr>
      <td>
        <Link
          to={`/${projectPath}/~issues/${issue.number}`}
          className="font-weight-bold"
        >
          #{issue.number} {issue.title}
        </Link>
      </td>
      <td>
        <span className={`badge badge-${stateBadgeColor(issue.state)}`}>
          {issue.state}
        </span>
      </td>
      <td className="text-muted">{issue.voteCount}</td>
      <td className="text-muted">{issue.commentCount}</td>
      <td className="text-muted">{issue.submitter?.name ?? "—"}</td>
      <td className="text-muted">{formatIssueDate(issue.submitDate)}</td>
    </tr>
  );
}
