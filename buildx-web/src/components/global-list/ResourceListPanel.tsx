import { type FormEvent, type ReactNode, useState } from "react";
import type { ListToolbarAction } from "../onedev/panels/ResourcefulListPanel";

type QueryToolbarLink = {
  icon: string;
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
};

type ResourceListPanelProps = {
  cardClass: string;
  queryPlaceholder: string;
  actionIcon?: string;
  actionTitle?: string;
  toolbarLinks?: QueryToolbarLink[];
  savedQueryToolbar?: ListToolbarAction[];
  count?: number;
  loading?: boolean;
  error?: string | null;
  children: ReactNode;
  query?: string;
  onQuery?: (query: string) => void;
};

function toToolbarLink(action: ListToolbarAction): QueryToolbarLink {
  return {
    icon: action.icon,
    label: action.label,
    href: action.href,
    onClick: action.onClick,
    className: action.className,
  };
}

export function ResourceListPanel({
  cardClass,
  queryPlaceholder,
  actionIcon = "plus",
  actionTitle = "Create",
  toolbarLinks = [],
  savedQueryToolbar = [],
  count,
  loading,
  error,
  children,
  query: controlledQuery,
  onQuery,
}: ResourceListPanelProps) {
  const [internalQuery, setInternalQuery] = useState("");
  const query = controlledQuery ?? internalQuery;
  const setQuery = (value: string) => {
    if (controlledQuery === undefined) {
      setInternalQuery(value);
    }
    onQuery?.(value);
  };

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onQuery?.(query);
  }

  const allToolbarLinks = [
    ...savedQueryToolbar.map(toToolbarLink),
    ...toolbarLinks,
  ];

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
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <span className="input-group-append">
                <button
                  type="submit"
                  className="btn btn-outline-secondary btn-icon"
                  title="Query"
                >
                  <img src="/~icon/magnify.svg" alt="" className="icon" width={16} height={16} />
                </button>
              </span>
            </div>
          </form>
          <a
            href="#"
            className="btn btn-primary btn-icon flex-shrink-0 ml-3"
            title={actionTitle}
            onClick={(e) => e.preventDefault()}
          >
            <img src={`/~icon/${actionIcon}.svg`} alt="" className="icon" width={16} height={16} />
          </a>
        </div>

        <div className="mb-5">
          {allToolbarLinks.map((link) => (
            <a
              key={link.label}
              href={link.href ?? "#"}
              className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${link.className ?? ""}`}
              onClick={(e) => {
                if (!link.href) {
                  e.preventDefault();
                }
                link.onClick?.();
              }}
            >
              <img src={`/~icon/${link.icon}.svg`} alt="" className="icon mr-1" width={14} height={14} />
              {link.label}
            </a>
          ))}
          {count !== undefined && (
            <span className="float-right text-gray">{count} total</span>
          )}
        </div>

        <div className="body">
          {error && <div className="alert alert-light-danger">{error}</div>}
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

export const DEFAULT_QUERY_LINKS: QueryToolbarLink[] = [
  { icon: "filter", label: "Filter" },
  { icon: "sort", label: "Order By" },
  { icon: "ellipsis-circle", label: "Operations" },
];
