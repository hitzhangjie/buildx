import type { ReactNode } from "react";
import { SavedQueriesPanel } from "./SavedQueriesPanel";
import type { UseSavedQueriesOptions } from "../../../hooks/useSavedQueries";
import { useSavedQueries } from "../../../hooks/useSavedQueries";

type QueryListLayoutProps = UseSavedQueriesOptions & {
  children: (savedQueries: ReturnType<typeof useSavedQueries>) => ReactNode;
  className?: string;
};

/**
 * side-main layout with Saved Queries panel and main content area.
 * Used by list pages that share OneDev query/order UI.
 */
export function QueryListLayout({
  children,
  className = "side-main side-main-wrap",
  ...savedQueryOptions
}: QueryListLayoutProps) {
  const savedQueries = useSavedQueries(savedQueryOptions);

  return (
    <div className={className}>
      <SavedQueriesPanel
        visible={savedQueries.visible}
        personalQueries={savedQueries.personalQueries}
        commonQueries={savedQueries.commonQueries}
        currentQuery={savedQueries.currentQuery}
        onClose={savedQueries.hide}
        onSelectQuery={savedQueries.onSelectQuery}
      />
      <div className="main">{children(savedQueries)}</div>
    </div>
  );
}

export { useSavedQueries };
