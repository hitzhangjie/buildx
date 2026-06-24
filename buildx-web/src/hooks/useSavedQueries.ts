import { useCallback, useMemo, useState } from "react";
import type { ListToolbarAction } from "../components/onedev/panels/ResourcefulListPanel";
import type { SavedQuery } from "../components/onedev/panels/SavedQueriesPanel";

const STORAGE_PREFIX = "buildx.savedQueries.";

function loadPersonalQueries(storageKey: string): SavedQuery[] {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + storageKey);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedQuery[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persistPersonalQueries(storageKey: string, queries: SavedQuery[]) {
  localStorage.setItem(STORAGE_PREFIX + storageKey, JSON.stringify(queries));
}

export type UseSavedQueriesOptions = {
  storageKey: string;
  commonQueries?: SavedQuery[];
  currentQuery: string;
  onSelectQuery: (query: string) => void;
  buildHref?: (query: string) => string;
};

export function useSavedQueries({
  storageKey,
  commonQueries = [],
  currentQuery,
  onSelectQuery,
  buildHref,
}: UseSavedQueriesOptions) {
  const [visible, setVisible] = useState(true);
  const [personalQueries, setPersonalQueries] = useState<SavedQuery[]>(() =>
    loadPersonalQueries(storageKey),
  );

  const hide = useCallback(() => setVisible(false), []);
  const show = useCallback(() => setVisible(true), []);

  const saveCurrentQuery = useCallback(() => {
    const query = currentQuery.trim();
    if (!query) {
      return;
    }
    const defaultName = query.length > 40 ? `${query.slice(0, 37)}...` : query;
    const name = window.prompt("Name saved query", defaultName);
    if (!name?.trim()) {
      return;
    }
    const trimmedName = name.trim();
    setPersonalQueries((prev) => {
      if (prev.some((item) => item.query === query)) {
        return prev;
      }
      const next: SavedQuery[] = [
        ...prev,
        {
          name: trimmedName,
          query,
          href: buildHref?.(query),
        },
      ];
      persistPersonalQueries(storageKey, next);
      return next;
    });
    setVisible(true);
  }, [buildHref, currentQuery, storageKey]);

  const toolbarActions = useMemo<ListToolbarAction[]>(() => {
    const actions: ListToolbarAction[] = [];
    if (!visible) {
      actions.push({
        icon: "eye",
        label: "Show Saved Queries",
        onClick: show,
        className: "show-saved-queries",
      });
    }
    actions.push({
      icon: "save",
      label: "Save Query",
      onClick: saveCurrentQuery,
      className: "save-query",
    });
    return actions;
  }, [saveCurrentQuery, show, visible]);

  return {
    visible,
    show,
    hide,
    personalQueries,
    commonQueries,
    currentQuery,
    onSelectQuery,
    toolbarActions,
    saveCurrentQuery,
  };
}
