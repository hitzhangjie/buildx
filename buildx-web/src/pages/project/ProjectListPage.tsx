import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { fetchProjects, type Project } from "../../api/projects";
import { ProjectListPanel } from "../../components/onedev/panels/ProjectListPanel";
import { SavedQueriesPanel } from "../../components/onedev/panels/SavedQueriesPanel";
import { Layout } from "../../layout/Layout";

const DEFAULT_COMMON_QUERIES = [
  { name: "All", query: "", href: "/~projects" },
  { name: "Roots", query: "roots", href: "/~projects?query=roots" },
];

/**
 * Mirrors OneDev ProjectListPage.html + ProjectListPage.java.
 * Reference: references/onedev/.../web/page/project/ProjectListPage.html
 */
export function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Read query from URL search params; mirrors OneDev PageParameters.get(PARAM_QUERY)
  const query = useMemo(() => searchParams.get("query") ?? "", [searchParams]);

  const handleQueryChange = useCallback(
    (newQuery: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (newQuery) {
          next.set("query", newQuery);
        } else {
          next.delete("query");
        }
        return next;
      }, { replace: true });
    },
    [setSearchParams],
  );

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const list = await fetchProjects();
        if (!cancelled) {
          setProjects(Array.isArray(list) ? list : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load projects");
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
  }, [refreshKey]);

  return (
    <Layout title="Projects" topbarTitle="Projects">
      <div className="side-main side-main-wrap p-2 p-sm-5">
        <SavedQueriesPanel commonQueries={DEFAULT_COMMON_QUERIES} currentQuery={query} />
        <div className="main">
          <ProjectListPanel
            projects={projects}
            loading={loading}
            errors={error ? [error] : []}
            query={query}
            onQueryChange={handleQueryChange}
            onRefresh={handleRefresh}
          />
        </div>
      </div>
    </Layout>
  );
}
