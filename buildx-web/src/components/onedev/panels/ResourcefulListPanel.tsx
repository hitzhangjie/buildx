import { type FormEvent, type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { FormFeedbackPanel } from "../FormFeedbackPanel";

export type ListToolbarAction = {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

type ResourcefulListPanelProps = {
  cardClass: string;
  queryPlaceholder: string;
  createLabel?: string;
  createHref?: string;
  createIcon?: string;
  toolbarActions: ListToolbarAction[];
  extraToolbar?: ReactNode;
  count?: number;
  loading?: boolean;
  errors?: string[];
  query: string;
  onQueryChange: (query: string) => void;
  children: ReactNode;
};

/**
 * Generic resource list panel matching OneDev list panel HTML structure.
 * Used by IssueList, PullRequestList, BuildList, PackList, WorkspaceList, etc.
 * Reference: references/onedev/.../web/component/{resource}/list/{Resource}ListPanel.html
 */
export function ResourcefulListPanel({
  cardClass,
  queryPlaceholder,
  createLabel = "Create",
  createHref,
  createIcon = "plus",
  toolbarActions,
  extraToolbar,
  count,
  loading,
  errors = [],
  query,
  onQueryChange,
  children,
}: ResourcefulListPanelProps) {
  const [inputQuery, setInputQuery] = useState(query);

  // Sync when external query changes
  const [lastPropQuery, setLastPropQuery] = useState(query);
  if (query !== lastPropQuery) {
    setLastPropQuery(query);
    setInputQuery(query);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onQueryChange(inputQuery);
  }

  return (
    <div className={`${cardClass} card no-autofocus`}>
      <div className="card-body">
        <div className="d-flex mb-4">
          <form className="clearable-wrapper flex-grow-1" onSubmit={handleSubmit}>
            <div className="input-group">
              <input
                spellCheck={false}
                autoComplete="off"
                className="form-control"
                placeholder={queryPlaceholder}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
              />
              <span className="input-group-append">
                <button
                  type="submit"
                  className="btn btn-outline-secondary btn-icon"
                  title="Query"
                  aria-label="Query"
                >
                  <Icon name="magnify" />
                </button>
              </span>
            </div>
          </form>
          {createHref ? (
            <Link
              to={createHref}
              className="add-new btn btn-primary btn-icon flex-shrink-0 ml-3"
              title={createLabel}
            >
              <Icon name={createIcon} />
            </Link>
          ) : (
            <button
              type="button"
              className="add-new btn btn-primary btn-icon flex-shrink-0 ml-3"
              title={createLabel}
              disabled
            >
              <Icon name={createIcon} />
            </button>
          )}
        </div>

        <div className="mb-5">
          {toolbarActions.map((action) => {
            if (action.href) {
              return (
                <Link
                  key={action.label}
                  to={action.href}
                  className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
                >
                  <Icon name={action.icon} /> {action.label}
                </Link>
              );
            }
            return (
              <a
                key={action.label}
                href="#"
                className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  action.onClick?.();
                }}
              >
                <Icon name={action.icon} /> {action.label}
              </a>
            );
          })}
          {extraToolbar}
          {count !== undefined && (
            <span className="float-right text-gray">{loading ? "…" : count}</span>
          )}
        </div>

        <div className="body">
          <FormFeedbackPanel messages={errors} />
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
