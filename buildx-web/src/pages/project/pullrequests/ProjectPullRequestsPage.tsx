import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { QueryListLayout } from "../../../components/onedev/panels/QueryListLayout";
import type { ListToolbarAction } from "../../../components/onedev/panels/ResourcefulListPanel";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import {
  fetchProjectPullRequests,
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type PullRequest,
} from "../../../api/pullRequests";
import { buildProjectScopedHref } from "../../../data/queryPresets";
import { formatWhenISO } from "../../../util/time";
import "./project-pull-requests-page.css";

const DEFAULT_TOOLBAR: ListToolbarAction[] = [
  { icon: "filter", label: "Filter", className: "opacity-50" },
  { icon: "sort", label: "Order By", className: "opacity-50" },
  { icon: "ellipsis-circle", label: "Operations", className: "opacity-50" },
];

export function ProjectPullRequestsPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [localQuery, setLocalQuery] = useState(query);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void fetchProjectPullRequests(projectPath, query)
      .then((items) => {
        if (!cancelled) {
          setPulls(items);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPulls([]);
          setError((err as { message?: string }).message ?? "Failed to load pull requests");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, query]);

  function handleQueryChange(nextQuery: string) {
    setLocalQuery(nextQuery);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (nextQuery.trim()) {
        next.set("query", nextQuery.trim());
      } else {
        next.delete("query");
      }
      return next;
    }, { replace: true });
  }

  function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    handleQueryChange(localQuery);
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Pull Requests">
      <div className="p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap"
          storageKey={`pulls:project:${projectPath}`}
          currentQuery={query}
          onSelectQuery={handleQueryChange}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~pulls`, q)}
        >
          {(savedQueries) => (
            <div className="pull-request-list card no-autofocus">
              <div className="card-body">
                <div className="d-flex mb-4">
                  <form className="clearable-wrapper flex-grow-1" onSubmit={handleQuerySubmit}>
                    <div className="input-group">
                      <input
                        spellCheck={false}
                        autoComplete="off"
                        className="form-control"
                        placeholder="Query/order pull requests"
                        value={localQuery}
                        onChange={(e) => setLocalQuery(e.target.value)}
                      />
                      <span className="input-group-append">
                        <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                          <Icon name="magnify" />
                        </button>
                      </span>
                    </div>
                  </form>
                  <Link
                    to={`/${projectPath}/~pulls/new`}
                    className="btn btn-primary flex-shrink-0 ml-3"
                    title="New Pull Request"
                  >
                    <Icon name="plus" /> New Pull Request
                  </Link>
                </div>
                <div className="operations mb-5">
                  {[...savedQueries.toolbarActions, ...DEFAULT_TOOLBAR].map((action) => (
                    <a
                      key={action.label}
                      href={action.href ?? "#"}
                      className={`text-gray d-inline-block mb-2 mr-4 ${action.className ?? ""}`}
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
                  <span className="float-right text-gray">{pulls.length}</span>
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="body">
                  {loading ? (
                    <div className="text-center text-muted py-5">Loading…</div>
                  ) : (
                    <table className="table">
                      <tbody>
                        {pulls.map((pr) => (
                          <tr key={pr.id}>
                            <td>
                              <div className="primary d-flex mb-3">
                                <div className="mr-4 flex-grow-1 d-flex flex-wrap row-gap-2">
                                  <span className="mr-2">
                                    <Link
                                      to={`/${projectPath}/~pulls/${pr.number}`}
                                      className="font-weight-bold title"
                                    >
                                      {pr.title}
                                    </Link>
                                    <span className="number ml-1 text-muted">#{pr.number}</span>
                                  </span>
                                  <span className={`badge badge-sm font-size-xs mr-2 status ${pullRequestStatusBadge(pr.status)}`}>
                                    {pullRequestStatusLabel(pr.status)}
                                  </span>
                                </div>
                                <div className="flex-shrink-0 d-none d-lg-block text-muted comments">
                                  <Icon name="comments" /> {pr.commentCount}
                                </div>
                              </div>
                              <div className="secondary d-flex flex-wrap row-gap-3 text-muted font-size-sm">
                                <div className="branches flex-shrink-0 text-nowrap mr-3">
                                  <Icon name="branch" />
                                  <span className="mx-1">{pr.targetBranch}</span>
                                  <span className="mx-1">&larr;</span>
                                  <span className="mx-1">{pr.sourceBranch}</span>
                                </div>
                                <div className="last-update ml-auto">
                                  <span>{pr.submitter?.name}</span>
                                  <span className="ml-2">{formatWhenISO(pr.submitDate)}</span>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {!pulls.length && !loading && (
                          <tr>
                            <td className="text-center text-muted py-5">No pull requests found</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          )}
        </QueryListLayout>
      </div>
    </ProjectLayout>
  );
}
