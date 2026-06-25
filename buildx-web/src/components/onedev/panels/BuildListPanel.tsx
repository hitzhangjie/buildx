import { type ReactNode, useCallback, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { BuildStatusIcon } from "../build/BuildStatusIcon";
import { Icon } from "../Icon";
import type { ListToolbarAction } from "./ResourcefulListPanel";
import { formatBuildDate, formatDuration, formatRefName } from "../../../util/build";

/* ------------------------------------------------------------------ */
/*  Toolbar dropdown helpers                                           */
/* ------------------------------------------------------------------ */

function ToolbarDropdown({
  icon,
  label,
  className,
  children,
}: {
  icon: string;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div className="dropdown-aware d-inline-block mr-4 mb-2 text-nowrap position-relative">
      <a
        href="#"
        className={`text-gray ${className ?? ""}`}
        onClick={(e) => {
          e.preventDefault();
          setOpen((v) => !v);
        }}
      >
        <Icon name={icon} /> {label}
      </a>
      {open && (
        <>
          <div
            className="dropdown-backdrop"
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1040,
            }}
          />
          <div
            ref={ref}
            className="dropdown-menu show p-3"
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              zIndex: 1050,
              minWidth: 220,
            }}
          >
            {children}
          </div>
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Filter dropdown                                                    */
/* ------------------------------------------------------------------ */

const STATUS_OPTIONS = [
  { label: "Any status", value: "" },
  { label: "Waiting", value: "Waiting" },
  { label: "Pending", value: "Pending" },
  { label: "Running", value: "Running" },
  { label: "Successful", value: "Successful" },
  { label: "Failed", value: "Failed" },
  { label: "Cancelled", value: "Cancelled" },
  { label: "Timed Out", value: "Timed Out" },
];

type FilterDropdownProps = {
  query: string;
  onApply: (query: string) => void;
};

function FilterDropdown({ query, onApply }: FilterDropdownProps) {
  const [job, setJob] = useState("");
  const [status, setStatus] = useState("");
  const [branch, setBranch] = useState("");

  function buildFilterQuery(): string {
    const parts: string[] = [];

    // Keep project scope if present
    const projMatch = query.match(/"Project" is "([^"]+)"/);
    if (projMatch) {
      parts.push(`"Project" is "${projMatch[1]}"`);
    }

    if (status) {
      parts.push(`"Status" is ${status}`);
    }
    if (job.trim()) {
      parts.push(`"Job" is "${job.trim()}"`);
    }
    if (branch.trim()) {
      const b = branch.trim();
      parts.push(
        `"Branch" is "${b.startsWith("refs/") ? b : "refs/heads/" + b}"`,
      );
    }

    return parts.join(" and ");
  }

  return (
    <div>
      <div className="font-weight-bolder mb-2">Filter builds</div>
      {/* Status */}
      <div className="mb-2">
        <label className="form-label font-size-xs text-muted mb-1">Status</label>
        <select
          className="form-control form-control-sm"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {/* Job */}
      <div className="mb-2">
        <label className="form-label font-size-xs text-muted mb-1">Job</label>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Job name"
          value={job}
          onChange={(e) => setJob(e.target.value)}
        />
      </div>
      {/* Branch */}
      <div className="mb-3">
        <label className="form-label font-size-xs text-muted mb-1">Branch</label>
        <input
          type="text"
          className="form-control form-control-sm"
          placeholder="Branch name"
          value={branch}
          onChange={(e) => setBranch(e.target.value)}
        />
      </div>
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-sm"
          onClick={() => onApply(buildFilterQuery())}
        >
          Apply
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => {
            setJob("");
            setStatus("");
            setBranch("");
            // Reset to just project scope
            const projMatch = query.match(/"Project" is "([^"]+)"/);
            onApply(projMatch ? `"Project" is "${projMatch[1]}"` : "");
          }}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Order By dropdown                                                  */
/* ------------------------------------------------------------------ */

const ORDER_OPTIONS = [
  { label: "Submit Date (newest first)", query: 'order by "Submit Date" desc' },
  { label: "Submit Date (oldest first)", query: 'order by "Submit Date" asc' },
  { label: "Finish Date (newest first)", query: 'order by "Finish Date" desc' },
  { label: "Finish Date (oldest first)", query: 'order by "Finish Date" asc' },
  { label: "Status", query: 'order by "Status"' },
  { label: "Job Name", query: 'order by "Job"' },
];

function OrderByDropdown({
  query,
  onApply,
}: {
  query: string;
  onApply: (query: string) => void;
}) {
  return (
    <div>
      <div className="font-weight-bolder mb-2">Order by</div>
      {ORDER_OPTIONS.map((o) => (
        <button
          key={o.query}
          type="button"
          className="dropdown-item mb-1"
          onClick={() => {
            // Remove existing order-by clause, then append new one
            const baseQuery = query.replace(/\s*order\s+by\s+".*?"(\s+(asc|desc))?\s*$/i, "").trim();
            onApply(baseQuery ? `${baseQuery} ${o.query}` : o.query);
          }}
        >
          {o.label}
        </button>
      ))}
      <hr className="my-2" />
      <button
        type="button"
        className="dropdown-item"
        onClick={() => {
          onApply(query.replace(/\s*order\s+by\s+".*?"(\s+(asc|desc))?\s*$/i, "").trim());
        }}
      >
        None (default)
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Operations dropdown                                                */
/* ------------------------------------------------------------------ */

type OperationsDropdownProps = {
  hasSelection?: boolean;
  onCancelAll?: () => void;
  onRerunAll?: () => void;
  onDeleteAll?: () => void;
};

function OperationsDropdown({
  hasSelection = false,
  onCancelAll,
  onRerunAll,
  onDeleteAll,
}: OperationsDropdownProps) {
  return (
    <div>
      <div className="font-weight-bolder mb-2">Operations</div>
      {hasSelection && (
        <>
          <button type="button" className="dropdown-item mb-1" disabled>
            Cancel Selected Builds
          </button>
          <button type="button" className="dropdown-item mb-1" disabled>
            Re-run Selected Builds
          </button>
          <button type="button" className="dropdown-item mb-1" disabled>
            Delete Selected Builds
          </button>
          <hr className="my-2" />
        </>
      )}
      <button
        type="button"
        className="dropdown-item mb-1"
        onClick={onCancelAll}
        disabled={!onCancelAll}
      >
        Cancel All Queried Builds
      </button>
      <button
        type="button"
        className="dropdown-item mb-1"
        onClick={onRerunAll}
        disabled={!onRerunAll}
      >
        Re-run All Queried Builds
      </button>
      <button
        type="button"
        className="dropdown-item"
        onClick={onDeleteAll}
        disabled={!onDeleteAll}
      >
        Delete All Queried Builds
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Display Params dropdown                                            */
/* ------------------------------------------------------------------ */

function DisplayParamsDropdown() {
  return (
    <div>
      <div className="font-weight-bolder mb-2">Params to Display</div>
      <p className="text-muted font-size-sm mb-2">
        Select which build parameters to show as table columns.
      </p>
      <p className="text-muted font-size-sm mb-0">
        No parameter columns available.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Run Job placeholder                                                */
/* ------------------------------------------------------------------ */

function RunJobButton() {
  const [open, setOpen] = useState(false);

  return (
    <span className="position-relative">
      <button
        type="button"
        className="add-new btn btn-primary btn-icon flex-shrink-0 ml-3"
        title="Run job"
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name="play" />
      </button>
      {open && (
        <>
          <div
            className="dropdown-backdrop"
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 1040 }}
          />
          <div
            className="dropdown-menu show p-4"
            style={{
              position: "absolute",
              top: "100%",
              right: 0,
              zIndex: 1050,
              minWidth: 300,
            }}
          >
            <div className="font-weight-bolder mb-3">Run Job</div>
            <p className="text-muted font-size-sm mb-0">
              Build execution engine is not yet implemented. Jobs can be
              triggered once the CI engine is available.
            </p>
          </div>
        </>
      )}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  BuildListPanel (main)                                              */
/* ------------------------------------------------------------------ */

type BuildListPanelProps = {
  builds: Build[];
  query: string;
  onQueryChange: (query: string) => void;
  loading?: boolean;
  errors?: string[];
  showProject?: boolean;
  projectPath?: string;
  savedQueryToolbar?: ListToolbarAction[];
};

function buildLink(build: Build, projectPath?: string): string {
  const path = projectPath ?? build.project?.path ?? "";
  return `/${path}/~builds/${build.number}`;
}

function lastUpdateDate(build: Build): string {
  return (
    build.finishDate ??
    build.runningDate ??
    build.pendingDate ??
    build.submitDate
  );
}

function buildDuration(build: Build): string {
  const running = build.runningDuration ?? 0;
  const pending = build.pendingDuration ?? 0;
  const total = running + pending;
  return formatDuration(total);
}

function OnBehalfOf({ build }: { build: Build }) {
  const branch = formatRefName(build.refName);
  const projectPath = build.project?.path ?? "";
  return (
    <div className="text-muted font-size-sm">
      {branch && (
        <>
          <Icon name="branch" />
          <span className="ml-1 mr-2">{branch}</span>
        </>
      )}
      {build.commitHash && (
        <>
          <Icon name="commit" />
          <Link
            to={`/${projectPath}/~commits/${build.commitHash}`}
            className="ml-1 text-muted"
          >
            {build.commitHash.slice(0, 8)}
          </Link>
        </>
      )}
    </div>
  );
}

export function BuildListPanel({
  builds,
  query,
  onQueryChange,
  loading,
  errors,
  showProject = false,
  projectPath,
  savedQueryToolbar = [],
}: BuildListPanelProps) {
  const handleQueryChange = useCallback(
    (newQuery: string) => {
      onQueryChange(newQuery);
    },
    [onQueryChange],
  );

  return (
    <div className="build-list card no-autofocus">
      <div className="card-body">
        {/* ---- query input + Run Job button ---- */}
        <div className="d-flex mb-4">
          <QueryInput query={query} onQueryChange={onQueryChange} />
          <RunJobButton />
        </div>

        {/* ---- toolbar ---- */}
        <div className="mb-4">
          {/* Saved queries actions */}
          {savedQueryToolbar.map((action) =>
            action.href ? (
              <Link
                key={action.label}
                to={action.href}
                className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
              >
                <Icon name={action.icon} /> {action.label}
              </Link>
            ) : (
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
            ),
          )}

          {/* Filter */}
          <ToolbarDropdown icon="filter" label="Filter">
            <FilterDropdown
              query={query}
              onApply={handleQueryChange}
            />
          </ToolbarDropdown>

          {/* Order By */}
          <ToolbarDropdown icon="sort" label="Order By">
            <OrderByDropdown query={query} onApply={handleQueryChange} />
          </ToolbarDropdown>

          {/* Operations */}
          <ToolbarDropdown icon="ellipsis-circle" label="Operations">
            <OperationsDropdown />
          </ToolbarDropdown>

          {/* Display Params */}
          <ToolbarDropdown
            icon="select"
            label="Display Params"
            className="d-none d-xl-inline"
          >
            <DisplayParamsDropdown />
          </ToolbarDropdown>

          {/* Count */}
          <span className="float-right text-gray">
            {builds.length}
          </span>
        </div>

        {/* ---- body ---- */}
        <div className="body">
          {errors && errors.length > 0 && (
            <div className="alert alert-light-danger mb-3" role="alert">
              {errors.filter(Boolean).map((e, i) => (
                <div key={i}>{e}</div>
              ))}
            </div>
          )}
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Build</th>
                  <th>On Behalf Of</th>
                  <th className="text-nowrap">Duration</th>
                  <th className="text-nowrap">Last Update</th>
                  {showProject && <th className="text-nowrap">Project</th>}
                </tr>
              </thead>
              <tbody>
                {builds.map((build) => (
                  <tr key={build.id}>
                    <td>
                      <div className="d-flex flex-wrap row-gap-2 align-items-center">
                        <Link
                          to={buildLink(build, projectPath)}
                          className="text-nowrap"
                        >
                          <BuildStatusIcon status={build.status} className="mr-1" />
                          <span>{build.jobName}</span>
                        </Link>
                        <span className="number ml-1 mr-2 text-muted">
                          #{build.number}
                        </span>
                      </div>
                      {build.submitter && (
                        <div className="text-muted font-size-sm mt-1">
                          <Icon name="user" />
                          <span className="ml-1">{build.submitter.name}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <OnBehalfOf build={build} />
                    </td>
                    <td className="text-nowrap">{buildDuration(build)}</td>
                    <td className="text-nowrap text-muted font-size-sm">
                      {formatBuildDate(lastUpdateDate(build))}
                    </td>
                    {showProject && (
                      <td className="text-nowrap">
                        {build.project && (
                          <Link to={`/${build.project.path}`}>
                            {build.project.path}
                          </Link>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {builds.length === 0 && (
                  <tr>
                    <td
                      colSpan={showProject ? 5 : 4}
                      className="text-center text-muted py-5"
                    >
                      No builds found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Query input (extracted from ResourcefulListPanel for flexibility)   */
/* ------------------------------------------------------------------ */

function QueryInput({
  query,
  onQueryChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
}) {
  const [inputQuery, setInputQuery] = useState(query);

  // Sync when external query changes
  const [lastPropQuery, setLastPropQuery] = useState(query);
  if (query !== lastPropQuery) {
    setLastPropQuery(query);
    setInputQuery(query);
  }

  return (
    <form
      className="clearable-wrapper flex-grow-1"
      onSubmit={(e) => {
        e.preventDefault();
        onQueryChange(inputQuery);
      }}
    >
      <div className="input-group">
        <input
          spellCheck={false}
          autoComplete="off"
          className="form-control"
          placeholder="Query/order builds"
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
  );
}
