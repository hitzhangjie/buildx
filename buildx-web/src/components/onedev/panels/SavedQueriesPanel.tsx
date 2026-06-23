import { useState } from "react";
import { Link } from "react-router-dom";

function OdIcon({ name, className = "icon" }: { name: string; className?: string }) {
  return <img src={`/~icon/${name}.svg`} alt="" className={className} width={14} height={14} />;
}

export type SavedQuery = {
  name: string;
  query: string;
  href: string;
};

type SavedQueriesPanelProps = {
  personalQueries?: SavedQuery[];
  commonQueries?: SavedQuery[];
};

/**
 * Mirrors OneDev SavedQueriesPanel.html (visible state).
 * Reference: references/onedev/.../web/component/savedquery/SavedQueriesPanel.html
 */
export function SavedQueriesPanel({
  personalQueries = [],
  commonQueries = [],
}: SavedQueriesPanelProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <div className="side">
        <button
          type="button"
          className="btn btn-sm btn-light"
          onClick={() => setVisible(true)}
        >
          <OdIcon name="eye" /> Show Saved Queries
        </button>
      </div>
    );
  }

  return (
    <div className="side">
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
              <OdIcon name="edit" />
            </button>
            <button
              type="button"
              className="close-saved-queries btn btn-light btn-xs btn-icon btn-hover-danger text-muted"
              title="Hide saved queries"
              aria-label="Hide saved queries"
              onClick={() => setVisible(false)}
            >
              <OdIcon name="times" />
            </button>
          </div>
        </div>
        <div className="card-body">
          {personalQueries.map((q) => (
            <div key={`p-${q.name}`} className="mb-4">
              <span className="btn-group">
                <Link to={q.href} className="btn btn-sm btn-outline-secondary text-left">
                  <span>{q.name}</span>
                </Link>
              </span>
            </div>
          ))}
          {commonQueries.map((q) => (
            <div key={`c-${q.name}`} className="mb-4">
              <span className="btn-group">
                <Link to={q.href} className="btn btn-sm btn-outline-secondary text-left">
                  <span>{q.name}</span>
                </Link>
              </span>
            </div>
          ))}
          {personalQueries.length === 0 && commonQueries.length === 0 && (
            <div className="text-muted font-size-sm">No saved queries</div>
          )}
        </div>
      </div>
    </div>
  );
}
