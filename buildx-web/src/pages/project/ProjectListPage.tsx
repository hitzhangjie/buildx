import { useEffect, useState } from "react";
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
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
  }, []);

  return (
    <Layout title="Projects" topbarTitle="Projects">
      <div className="side-main side-main-wrap p-2 p-sm-5">
        <SavedQueriesPanel commonQueries={DEFAULT_COMMON_QUERIES} />
        <div className="main">
          <ProjectListPanel
            projects={projects}
            loading={loading}
            errors={error ? [error] : []}
            query={query}
            onQueryChange={setQuery}
          />
        </div>
      </div>
    </Layout>
  );
}
