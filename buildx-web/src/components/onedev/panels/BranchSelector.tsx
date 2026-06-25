import { useEffect, useState, useCallback, useRef } from "react";
import { Icon } from "../Icon";
import { fetchBranches, fetchTags } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";
import type { Project } from "../../../api/projects";

export interface BranchSelection {
  projectId: number;
  projectPath: string;
  branch: string;
  commitHash?: string;
}

interface BranchSelectorProps {
  /** Project path to default to. */
  defaultProjectPath: string;
  /** Currently selected revision (branch or tag name). */
  revision: string;
  /** Called when selection changes. */
  onSelect: (selection: BranchSelection) => void;
  /** Label for the selector (e.g. "Target", "Source"). */
  label?: string;
}

type Tab = "branches" | "tags";

/** Which dropdown is currently open — project picker, branch picker, or none. */
type OpenPanel = "project" | "branch" | null;

export function BranchSelector({
  defaultProjectPath,
  revision,
  onSelect,
  label,
}: BranchSelectorProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);

  const [openPanel, setOpenPanel] = useState<OpenPanel>(null);
  const [tab, setTab] = useState<Tab>("branches");
  const [query, setQuery] = useState("");

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects on mount.
  useEffect(() => {
    let cancelled = false;
    fetchProjects()
      .then((p) => {
        if (!cancelled) setProjects(p);
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load projects");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Resolve default project ID.
  useEffect(() => {
    if (projects.length === 0) return;
    const match = projects.find((p) => p.path === defaultProjectPath);
    setSelectedProjectId(match?.id ?? projects[0].id);
  }, [projects, defaultProjectPath]);

  // Load branches/tags when project changes.
  useEffect(() => {
    if (!selectedProjectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchBranches(selectedProjectId), fetchTags(selectedProjectId)])
      .then(([b, t]) => {
        if (!cancelled) {
          setBranches(b);
          setTags(t);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load refs");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId]);

  // Close on outside click.
  useEffect(() => {
    if (!openPanel) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpenPanel(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openPanel]);

  // Reset search when opening branch panel.
  useEffect(() => {
    if (openPanel === "branch") {
      setQuery("");
      // Focus the search input after render.
      requestAnimationFrame(() => branchInputRef.current?.focus());
    }
  }, [openPanel]);

  const selectedProject = projects.find((p) => p.id === selectedProjectId);
  const displayBranch = revision || "Choose Revision";
  const projectDisplay = selectedProject?.path ?? defaultProjectPath;

  const handleBranchSelect = useCallback(
    (branch: string) => {
      setOpenPanel(null);
      if (selectedProjectId && branch !== revision) {
        onSelect({
          projectId: selectedProjectId,
          projectPath: selectedProject?.path ?? defaultProjectPath,
          branch,
        });
      }
    },
    [onSelect, revision, selectedProjectId, selectedProject, defaultProjectPath],
  );

  const items = tab === "branches" ? branches : tags;
  const filtered = query
    ? items.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    : items;

  return (
    <div ref={rootRef} className="selector d-inline-block position-relative">
      <span className="text-nowrap">
        {/* ---- Project button ---- */}
        <a
          className={`project btn btn-sm btn-outline-secondary text-nowrap mr-2${openPanel === "project" ? " active" : ""}`}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (loading) return;
            setOpenPanel(openPanel === "project" ? null : "project");
          }}
        >
          <Icon name="project" className="icon mr-1" />
          <span>{projectDisplay}</span>
          <Icon name="arrow" className="icon rotate-90 ml-1" />
        </a>

        {/* ---- Branch button ---- */}
        <a
          className={`branch btn btn-sm btn-outline-secondary text-nowrap${openPanel === "branch" ? " active" : ""}`}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            if (loading) return;
            setOpenPanel(openPanel === "branch" ? null : "branch");
          }}
        >
          <Icon name="branch" className="icon mr-1" />
          <span>{displayBranch}</span>
          <Icon name="arrow" className="icon rotate-90 ml-1" />
        </a>
      </span>

      {/* ---- Dropdown ---- */}
      {openPanel && (
        <div
          className="floating dropdown-menu show position-absolute p-4"
          style={{ zIndex: 1050, minWidth: "320px", top: "100%", left: 0 }}
        >
          {label && (
            <div className="title font-weight-bold mb-3">{label}</div>
          )}

          {/* Project selector (shown in both panels) */}
          {openPanel === "project" && (
            <div className="mb-3">
              <select
                className="form-control form-control-sm custom-select"
                value={selectedProjectId ?? ""}
                onChange={(e) => {
                  const id = Number(e.target.value);
                  setSelectedProjectId(id);
                }}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.path}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Branch/Tag panel content */}
          {openPanel === "branch" && (
            <>
              {/* Search input */}
              <div className="d-flex align-items-center mb-3">
                <input
                  ref={branchInputRef}
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Input revision"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const trimmed = query.trim();
                      if (trimmed) handleBranchSelect(trimmed);
                    }
                  }}
                />
                <Icon name="magnify" className="icon text-muted ml-2" />
              </div>

              {/* Tabs */}
              <ul className="nav nav-tabs nav-tabs-line mb-3">
                <li className="nav-item">
                  <a
                    className={`nav-link${tab === "branches" ? " active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("branches");
                    }}
                  >
                    Branches
                  </a>
                </li>
                <li className="nav-item">
                  <a
                    className={`nav-link${tab === "tags" ? " active" : ""}`}
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setTab("tags");
                    }}
                  >
                    Tags
                  </a>
                </li>
              </ul>

              {error && <div className="alert alert-light-danger mb-0 py-2">{error}</div>}
              {loading && <div className="text-muted text-center py-3">Loading…</div>}

              {!loading && !error && (
                <ul className="items list-unstyled mb-0" style={{ maxHeight: "240px", overflowY: "auto" }}>
                  {filtered.map((name) => {
                    const icon = tab === "branches" ? "branch" : "tag";
                    const isActive = name === revision;
                    return (
                      <li key={name} className="selectable">
                        <a
                          className={`d-flex align-items-center py-1${isActive ? " text-primary font-weight-bold" : ""}`}
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            handleBranchSelect(name);
                          }}
                        >
                          <Icon name={icon} className="icon mr-2" />
                          <span className="text-nowrap">{name}</span>
                        </a>
                      </li>
                    );
                  })}
                  {query.trim() && !filtered.some((n) => n === query.trim()) && (
                    <li className="selectable">
                      <a
                        className="d-flex align-items-center py-1"
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          handleBranchSelect(query.trim());
                        }}
                      >
                        <Icon name="commit" className="icon mr-2" />
                        <span className="text-nowrap">Use &quot;{query.trim()}&quot;</span>
                      </a>
                    </li>
                  )}
                  {filtered.length === 0 && !query.trim() && (
                    <li className="alert alert-notice alert-light-warning mb-0">
                      No {tab} found
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
