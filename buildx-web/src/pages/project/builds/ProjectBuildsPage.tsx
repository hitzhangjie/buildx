import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { queryBuilds } from "../../../api/builds";
import { BuildListPanel } from "../../../components/onedev/panels/BuildListPanel";
import { QueryListLayout } from "../../../components/onedev/panels/QueryListLayout";
import {
  BUILD_COMMON_QUERIES,
  buildProjectScopedHref,
} from "../../../data/queryPresets";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

export function ProjectBuildsPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));
  const [builds, setBuilds] = useState<Awaited<ReturnType<typeof queryBuilds>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBuilds = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const offset = (page - 1) * 25;
      const scopedQuery = query.trim()
        ? query
        : `"Project" is "${projectPath}"`;
      const items = await queryBuilds({
        query: scopedQuery,
        offset,
        count: 25,
      });
      setBuilds(items);
    } catch (err) {
      setBuilds([]);
      setError((err as { message?: string }).message ?? "Failed to load builds");
    } finally {
      setLoading(false);
    }
  }, [projectPath, query, page]);

  useEffect(() => {
    void loadBuilds();
  }, [loadBuilds]);

  function handleQueryChange(nextQuery: string) {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (nextQuery.trim()) {
        params.set("query", nextQuery.trim());
      } else {
        params.delete("query");
      }
      params.delete("page");
      return params;
    }, { replace: true });
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Builds">
      <div className="p-2 p-sm-3">
        <QueryListLayout
          className="side-main side-main-wrap"
          storageKey={`builds:project:${projectPath}`}
          commonQueries={BUILD_COMMON_QUERIES}
          currentQuery={query}
          onSelectQuery={handleQueryChange}
          buildHref={(q) => buildProjectScopedHref(`/${projectPath}/~builds`, q)}
        >
          {(savedQueries) => (
            <BuildListPanel
              builds={builds}
              query={query}
              onQueryChange={handleQueryChange}
              loading={loading}
              errors={error ? [error] : []}
              projectPath={projectPath}
              savedQueryToolbar={savedQueries.toolbarActions}
            />
          )}
        </QueryListLayout>
      </div>
    </ProjectLayout>
  );
}
