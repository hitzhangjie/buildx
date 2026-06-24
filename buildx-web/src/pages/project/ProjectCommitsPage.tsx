import { useEffect, useState } from "react";
import { Icon } from "../../components/onedev/Icon";
import { QueryListLayout } from "../../components/onedev/panels/QueryListLayout";
import { QueryToolbar, queryToolbarCount } from "../../components/onedev/panels/QueryToolbar";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjects } from "../../api/projects";
import { fetchCommits, type RepositoryCommit } from "../../api/repositories";
import { buildProjectScopedHref } from "../../data/queryPresets";
import { CommitHistoryGraph } from "../../components/onedev/CommitHistoryGraph";

export function ProjectCommitsPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");
  const [commits, setCommits] = useState<RepositoryCommit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects();
        const project = projects.find((item) => item.path === projectPath);
        if (!project) {
          if (!cancelled) {
            setCommits([]);
            setError("Project not found");
          }
          return;
        }

        const data = await fetchCommits(project.id, { count: 100 });
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
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Client-side filtering by subject, hash, or author
  const filtered = commits.filter((commit) => {
    if (!query) {
      return true;
    }
    const haystack = `${commit.subject ?? ""} ${commit.hash} ${commit.author?.name ?? ""}`.toLowerCase();
    return haystack.includes(query.toLowerCase());
  });

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Commits">
      <div className="p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap"
          storageKey={`commits:project:${projectPath}`}
          currentQuery={query}
          onSelectQuery={setQuery}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~commits`, q)}
        >
          {(savedQueries) => (
            <div className="card commit-list no-autofocus">
              <div className="card-body">
                {/* Search bar */}
                <div className="d-flex mb-3">
                  <form className="clearable-wrapper flex-grow-1" onSubmit={(e) => e.preventDefault()}>
                    <div className="input-group">
                      <input
                        spellCheck={false}
                        autoComplete="off"
                        className="form-control"
                        placeholder="Query/order commits"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
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

                {/* Toolbar */}
                <QueryToolbar
                  actions={[
                    ...savedQueries.toolbarActions,
                    { icon: "filter", label: "Filter", className: "opacity-50" },
                  ]}
                  trailing={queryToolbarCount(`${filtered.length} commits`)}
                />

                {/* Commit list / graph */}
                <div className="body">
                  {loading && (
                    <div className="text-center text-muted py-5">Loading…</div>
                  )}
                  {!loading && (
                    <CommitHistoryGraph
                      commits={filtered}
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
