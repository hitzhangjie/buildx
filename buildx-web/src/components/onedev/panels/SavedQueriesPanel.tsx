import { Link } from "react-router-dom";
import { Icon } from "../Icon";

export type SavedQuery = {
  name: string;
  query: string;
  href?: string;
};

type SavedQueriesPanelProps = {
  visible?: boolean;
  personalQueries?: SavedQuery[];
  commonQueries?: SavedQuery[];
  /** The currently active query string, used to highlight the selected saved query. */
  currentQuery?: string;
  onClose?: () => void;
  onSelectQuery?: (query: string) => void;
};

function SavedQueryButton({
  item,
  currentQuery,
  onSelectQuery,
}: {
  item: SavedQuery;
  currentQuery?: string;
  onSelectQuery?: (query: string) => void;
}) {
  const active = item.query === (currentQuery ?? "");
  const className = `btn btn-sm btn-outline-secondary text-left${active ? " active" : ""}`;

  if (item.href) {
    return (
      <Link to={item.href} className={className}>
        <span>{item.name}</span>
      </Link>
    );
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => onSelectQuery?.(item.query)}
    >
      <span>{item.name}</span>
    </button>
  );
}

/**
 * Mirrors OneDev SavedQueriesPanel.html (visible state).
 * Reference: references/onedev/.../web/component/savedquery/SavedQueriesPanel.html
 */
export function SavedQueriesPanel({
  visible = true,
  personalQueries = [],
  commonQueries = [],
  currentQuery,
  onClose,
  onSelectQuery,
}: SavedQueriesPanelProps) {
  if (!visible) {
    return null;
  }

  const queries = [...personalQueries, ...commonQueries];

  return (
    <div className="side d-none d-xl-block">
      <div className="saved-queries card">
        <div className="card-header">
          <h3 className="card-title mr-4">Saved Queries</h3>
          <div className="card-toolbar">
            <button
              type="button"
              className="edit-saved-queries mr-2 btn btn-light btn-xs btn-icon btn-hover-primary text-muted"
              title="Edit saved queries"
              aria-label="Edit saved queries"
            >
              <Icon name="edit" />
            </button>
            <button
              type="button"
              className="close-saved-queries btn btn-light btn-xs btn-icon btn-hover-danger text-muted"
              title="Hide saved queries"
              aria-label="Hide saved queries"
              onClick={onClose}
            >
              <Icon name="times" />
            </button>
          </div>
        </div>
        <div className="card-body">
          {queries.map((q) => (
            <div key={`${q.name}-${q.query}`} className="mb-4">
              <span className="btn-group">
                <SavedQueryButton
                  item={q}
                  currentQuery={currentQuery}
                  onSelectQuery={onSelectQuery}
                />
              </span>
            </div>
          ))}
          {queries.length === 0 && (
            <div className="text-muted font-size-sm">No saved queries</div>
          )}
        </div>
      </div>
    </div>
  );
}
