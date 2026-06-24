import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { QueryListLayout } from "../../components/onedev/panels/QueryListLayout";
import { InlineDropdown } from "../../components/onedev/DropdownMenu";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjects } from "../../api/projects";
import { fetchCommits, type RepositoryCommit } from "../../api/repositories";
import {
  COMMIT_COMMON_QUERIES,
  buildProjectScopedHref,
} from "../../data/queryPresets";
import { CommitHistoryGraph } from "../../components/onedev/CommitHistoryGraph";
import {
  CommitFilterPanel,
  buildCommitQueryString,
  type CommitFilterState,
} from "../../components/onedev/CommitFilterPanel";

export function ProjectCommitsPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";

  const [commits, setCommits] = useState<RepositoryCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<number | null>(null);

  // Load project ID once.
  useEffect(() => {
    if (!projectPath) return;
    let cancelled = false;
    async function load() {
      try {
        const projects = await fetchProjects();
        const project = projects.find((p) => p.path === projectPath);
        if (!cancelled && project) {
          setProjectId(project.id);
        }
      } catch {
        // ignore — projectId stays null, commits will show an error.
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectPath]);

  // Load commits whenever project, query, or projectId changes.
  useEffect(() => {
    if (!projectPath || !projectId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCommits(projectId!, {
          count: 100,
          query: query.trim() || undefined,
        });
        if (!cancelled) {
          setCommits(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load commits");
          setCommits([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [projectPath, projectId, query]);

  // Query change handler — updates URL search params.
  const handleQueryChange = useCallback(
    (nextQuery: string) => {
      setSearchParams((prev) => {
        const params = new URLSearchParams(prev);
        if (nextQuery.trim()) {
          params.set("query", nextQuery.trim());
        } else {
          params.delete("query");
        }
        return params;
      }, { replace: true });
    },
    [setSearchParams],
  );

  // Filter panel handler — builds query string from filter selections.
  const handleFilterChange = useCallback(
    (state: CommitFilterState) => {
      const qs = buildCommitQueryString(state);
      handleQueryChange(qs);
    },
    [handleQueryChange],
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Commits">
      <div className="p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap"
          storageKey={`commits:project:${projectPath}`}
          commonQueries={COMMIT_COMMON_QUERIES}
          currentQuery={query}
          onSelectQuery={handleQueryChange}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~commits`, q)}
        >
          {(savedQueries) => (
            <div className="card commit-list no-autofocus">
              <div className="card-body">
                {/* Search bar */}
                <div className="d-flex mb-3">
                  <form
                    className="clearable-wrapper flex-grow-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const input = e.currentTarget.querySelector("input") as HTMLInputElement | null;
                      if (input) handleQueryChange(input.value);
                    }}
                  >
                    <div className="input-group">
                      <input
                        spellCheck={false}
                        autoComplete="off"
                        className="form-control"
                        placeholder="Query/order commits"
                        defaultValue={query}
                        onBlur={(e) => handleQueryChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleQueryChange((e.target as HTMLInputElement).value);
                          }
                        }}
                      />
                      <span className="input-group-append">
                        <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                          <Icon name="magnify" />
                        </button>
                      </span>
                    </div>
                  </form>
                </div>

                {error && <div className="alert alert-light-danger">{error}</div>}

                {/* Toolbar: saved query actions + filter dropdown (left) + count (right) */}
                <div className="operations mb-5">
                  {savedQueries.toolbarActions.map((action) => (
                    <a
                      key={action.label}
                      href={action.href ?? "#"}
                      className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
                      onClick={(e) => {
                        if (!action.href) e.preventDefault();
                        action.onClick?.();
                      }}
                    >
                      <Icon name={action.icon} /> {action.label}
                    </a>
                  ))}
                  <InlineDropdown
                    label={<><Icon name="filter" /> Filter</>}
                    className="text-gray d-inline-block mr-4 mb-2 text-nowrap"
                  >
                    {() => (
                      <div className="card" style={{ padding: 0 }}>
                        <CommitFilterPanel
                          onChange={handleFilterChange}
                          projectId={projectId ?? 0}
                        />
                      </div>
                    )}
                  </InlineDropdown>
                  <span className="float-right text-gray">{commits.length} commits</span>
                </div>

                {/* Commit list / graph */}
                <div className="body">
                  {loading && (
                    <div className="text-center text-muted py-5">Loading…</div>
                  )}
                  {!loading && (
                    <CommitHistoryGraph
                      commits={commits}
                      projectPath={projectPath}
                    />
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
