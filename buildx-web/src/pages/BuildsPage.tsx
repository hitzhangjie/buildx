import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { queryBuilds } from "../api/builds";
import { BuildListPanel } from "../components/onedev/panels/BuildListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { BUILD_COMMON_QUERIES, buildProjectScopedHref } from "../data/queryPresets";

export function BuildsPage() {
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
      const items = await queryBuilds({ query, offset, count: 25 });
      setBuilds(items);
    } catch (err) {
      setBuilds([]);
      setError((err as { message?: string }).message ?? "Failed to load builds");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

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
    <SideMainPage
      title="Builds"
      savedQueries={{
        storageKey: "builds:global",
        commonQueries: BUILD_COMMON_QUERIES,
        currentQuery: query,
        onSelectQuery: handleQueryChange,
        buildHref: (q) => buildProjectScopedHref("/~builds", q),
      }}
    >
      {(savedQueries) => (
        <BuildListPanel
          builds={builds}
          query={query}
          onQueryChange={handleQueryChange}
          loading={loading}
          errors={error ? [error] : []}
          showProject
          savedQueryToolbar={savedQueries.toolbarActions}
        />
      )}
    </SideMainPage>
  );
}
