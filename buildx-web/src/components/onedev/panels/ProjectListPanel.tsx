import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import type { Project } from "../../../api/projects";
import { moveProject, deleteProject } from "../../../api/projects";
import { type ApiError } from "../../../api/client";
import { useAuth } from "../../../context/AuthContext";
import { ConfirmModal } from "../ConfirmModal";
import { InlineDropdown } from "../DropdownMenu";
import { FormFeedbackPanel } from "../FormFeedbackPanel";
import { Icon } from "../Icon";

type ProjectListPanelProps = {
  projects: Project[];
  loading: boolean;
  errors?: string[];
  query?: string;
  onQueryChange?: (query: string) => void;
  onRefresh?: () => void;
};

type OperationStatus = {
  message: string;
  error?: string;
};

/**
 * Mirrors OneDev ProjectListPanel.html and its Operations menu.
 * Reference: references/onedev/.../web/component/project/list/ProjectListPanel.html
 */
export function ProjectListPanel({
  projects,
  loading,
  errors = [],
  query = "",
  onQueryChange,
  onRefresh,
}: ProjectListPanelProps) {
  const { user } = useAuth();
  const [inputQuery, setInputQuery] = useState(query);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [operationStatus, setOperationStatus] = useState<OperationStatus | null>(null);
  const mountedRef = useRef(true);

  // Sync inputQuery when the query prop changes externally (e.g. saved query clicked in sidebar)
  useEffect(() => {
    setInputQuery(query);
  }, [query]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  function handleQuerySubmit(e: FormEvent) {
    e.preventDefault();
    onQueryChange?.(inputQuery);
  }

  // ---- selection -----------------------------------------------------------

  const someSelected = selectedIds.size > 0;

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ---- operations ----------------------------------------------------------

  // ---- individual operation handlers ---------------------------------------

  async function handleMoveSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await moveProject(id, null);
      }
      if (mountedRef.current) {
        setSelectedIds(new Set());
        onRefresh?.();
      }
    } catch (err) {
      if (mountedRef.current) {
        setOperationStatus({
          message: "move",
          error: (err as ApiError).message ?? "Failed to move projects",
        });
      }
    }
  }

  async function handleMoveAllQueried() {
    const ids = projects.map((p) => p.id);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await moveProject(id, null);
      }
      if (mountedRef.current) {
        setSelectedIds(new Set());
        onRefresh?.();
      }
    } catch (err) {
      if (mountedRef.current) {
        setOperationStatus({
          message: "move",
          error: (err as ApiError).message ?? "Failed to move projects",
        });
      }
    }
  }

  async function handleDeleteSelected() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await deleteProject(id);
      }
      if (mountedRef.current) {
        setSelectedIds(new Set());
        onRefresh?.();
      }
    } catch (err) {
      if (mountedRef.current) {
        setOperationStatus({
          message: "delete",
          error: (err as ApiError).message ?? "Failed to delete projects",
        });
      }
    }
  }

  async function handleDeleteAllQueried() {
    const ids = projects.map((p) => p.id);
    if (ids.length === 0) return;
    try {
      for (const id of ids) {
        await deleteProject(id);
      }
      if (mountedRef.current) {
        setSelectedIds(new Set());
        onRefresh?.();
      }
    } catch (err) {
      if (mountedRef.current) {
        setOperationStatus({
          message: "delete",
          error: (err as ApiError).message ?? "Failed to delete projects",
        });
      }
    }
  }

  // ---- confirm modal state -------------------------------------------------

  const [confirmModal, setConfirmModal] = useState<{
    message: string;
    confirmInput: string;
    onConfirm: () => void;
  } | null>(null);

  function openConfirm(
    message: string,
    confirmInput: string,
    onConfirm: () => void,
  ) {
    setConfirmModal({ message, confirmInput, onConfirm });
  }

  function closeConfirm() {
    setConfirmModal(null);
  }

  // ---- helpers -------------------------------------------------------------

  const isLoggedIn = !!user;
  const hasRootPerm = true; // TODO: check SecurityUtils.canCreateRootProjects equivalent

  return (
    <div className="project-list card no-autofocus">
      <div className="card-body">
        <div className="d-flex mb-4">
          <form className="clearable-wrapper flex-grow-1" onSubmit={handleQuerySubmit}>
            <div className="input-group">
              <input
                spellCheck={false}
                autoComplete="off"
                className="form-control"
                placeholder="Query/order projects"
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
          <Link to="/~projects/new" className="btn btn-primary btn-icon flex-shrink-0 ml-3" title="New project">
            <Icon name="plus" />
          </Link>
        </div>

        <div className="operations mb-4">
          <a href="#saved-queries" className="show-saved-queries text-gray d-inline-block mb-2 mr-4">
            <Icon name="eye" /> Show Saved Queries
          </a>
          <span className="save-query text-gray d-inline-block mb-2 mr-4 opacity-50">
            <Icon name="save" /> Save Query
          </span>
          <span className="filter text-gray mr-4 mb-2 d-inline-block text-nowrap opacity-50">
            <Icon name="filter" /> Filter
          </span>
          <span className="order-by text-gray d-inline-block mb-2 mr-4 opacity-50">
            <Icon name="sort" /> Order By
          </span>

          {/* Operations dropdown — only visible when logged in, matching OneDev */}
          {isLoggedIn ? (
            <InlineDropdown
              label={<><Icon name="ellipsis-circle" /> Operations</>}
              className="operations d-inline-block mb-2 mr-4"
            >
              <div className="list-group list-group-flush">
                {/* Move Selected Projects To... */}
                <a
                  className={`list-group-item list-group-item-action${!someSelected ? " disabled" : ""}`}
                  href="#"
                  title={!someSelected ? "Please select projects to move" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!someSelected) return;
                    openConfirm(
                      `Type <code>yes</code> below to move selected projects to be under root`,
                      "yes",
                      () => {
                        handleMoveSelected();
                        closeConfirm();
                      },
                    );
                  }}
                >
                  Move Selected Projects To...
                </a>

                {/* Set Selected As Root Projects */}
                {hasRootPerm && (
                  <a
                    className={`list-group-item list-group-item-action${!someSelected ? " disabled" : ""}`}
                    href="#"
                    title={!someSelected ? "Please select projects to modify" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      if (!someSelected) return;
                      openConfirm(
                        "Type <code>yes</code> below to set selected as root projects",
                        "yes",
                        () => {
                          handleMoveSelected();
                          closeConfirm();
                        },
                      );
                    }}
                  >
                    Set Selected As Root Projects
                  </a>
                )}

                {/* Delete Selected Projects */}
                <a
                  className={`list-group-item list-group-item-action${!someSelected ? " disabled" : ""}`}
                  href="#"
                  title={!someSelected ? "Please select projects to delete" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!someSelected) return;
                    openConfirm(
                      "Type <code>yes</code> below to delete selected projects",
                      "yes",
                      () => {
                        handleDeleteSelected();
                        closeConfirm();
                      },
                    );
                  }}
                >
                  Delete Selected Projects
                </a>

                {/* Move All Queried Projects To... */}
                <a
                  className={`list-group-item list-group-item-action${projects.length === 0 ? " disabled" : ""}`}
                  href="#"
                  title={projects.length === 0 ? "No projects to move" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (projects.length === 0) return;
                    openConfirm(
                      `Type <code>yes</code> below to move all queried projects to be under root`,
                      "yes",
                      () => {
                        handleMoveAllQueried();
                        closeConfirm();
                      },
                    );
                  }}
                >
                  Move All Queried Projects To...
                </a>

                {/* Set All Queried As Root Projects */}
                {hasRootPerm && (
                  <a
                    className={`list-group-item list-group-item-action${projects.length === 0 ? " disabled" : ""}`}
                    href="#"
                    title={projects.length === 0 ? "No projects to modify" : undefined}
                    onClick={(e) => {
                      e.preventDefault();
                      if (projects.length === 0) return;
                      openConfirm(
                        "Type <code>yes</code> below to set all queried as root projects",
                        "yes",
                        () => {
                          handleMoveAllQueried();
                          closeConfirm();
                        },
                      );
                    }}
                  >
                    Set All Queried As Root Projects
                  </a>
                )}

                {/* Delete All Queried Projects */}
                <a
                  className={`list-group-item list-group-item-action${projects.length === 0 ? " disabled" : ""}`}
                  href="#"
                  title={projects.length === 0 ? "No projects to delete" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (projects.length === 0) return;
                    openConfirm(
                      "Type <code>delete ALL projects</code> below to delete all queried projects",
                      "delete ALL projects",
                      () => {
                        handleDeleteAllQueried();
                        closeConfirm();
                      },
                    );
                  }}
                >
                  Delete All Queried Projects
                </a>
              </div>
            </InlineDropdown>
          ) : (
            <span className="operations d-inline-block mb-2 mr-4 text-gray opacity-50">
              <Icon name="ellipsis-circle" /> Operations
            </span>
          )}

          <Link to="/~projects/import/stub" className="import-projects d-inline-block mb-2 mr-4 text-gray">
            <Icon name="import" /> Import
          </Link>
          <span className="float-right text-gray">{loading ? "…" : projects.length}</span>
        </div>

        <div>
          <FormFeedbackPanel messages={errors} />
          {operationStatus?.error && (
            <FormFeedbackPanel messages={[operationStatus.error]} />
          )}
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : (
            <table className="table">
              <thead style={{ display: "none" }}>
                <tr>
                  {isLoggedIn && <th />}
                  <th>Project</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    {isLoggedIn && (
                      <td className="row-selector">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(project.id)}
                          onChange={() => toggleSelect(project.id)}
                        />
                      </td>
                    )}
                    <td>
                      <div className="d-flex align-items-center flex-wrap row-gap-2 font-size-h5">
                        <Link to={`/${project.path}`} className="mr-2">
                          <img
                            src="/~icon/project.svg"
                            alt=""
                            className="icon mr-2"
                            width={20}
                            height={20}
                          />
                          <span>{project.path}</span>
                        </Link>
                      </div>
                      {project.name && project.name !== project.path && (
                        <div className="mt-1 font-size-sm text-muted">{project.name}</div>
                      )}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={isLoggedIn ? 2 : 1} className="no-elements">
                      No projects found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Confirm modal, portaled to document.body */}
      {confirmModal && (
        <ConfirmModal
          message={confirmModal.message}
          confirmInput={confirmModal.confirmInput}
          error={operationStatus?.error}
          onConfirm={confirmModal.onConfirm}
          onCancel={closeConfirm}
        />
      )}
    </div>
  );
}
