import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBranches, fetchTags } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";
import { blobUrl } from "../../../util/blobPath";
import "./revision-selector.css";

interface RevisionPickerProps {
  projectPath: string;
  currentRevision: string;
  currentPath: string;
}

type Tab = "branches" | "tags";

export function RevisionPicker({ projectPath, currentRevision, currentPath }: RevisionPickerProps) {
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("branches");
  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch branches and tags on mount
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects();
        const project = projects.find((p) => p.path === projectPath);
        if (!project) {
          if (!cancelled) setError("Project not found");
          return;
        }
        const [branchNames, tagNames] = await Promise.all([
          fetchBranches(project.id),
          fetchTags(project.id),
        ]);
        if (!cancelled) {
          setBranches(branchNames);
          setTags(tagNames);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load refs");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectPath]);

  // Outside click to close
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSelect = useCallback((revision: string) => {
    setOpen(false);
    if (revision === currentRevision) return;
    navigate(blobUrl(projectPath, revision, currentPath));
  }, [currentRevision, navigate, projectPath, currentPath]);

  const items = tab === "branches" ? branches : tags;
  const filtered = query
    ? items.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    : items;

  const displayIcon = currentRevision ? "branch" : "branch";
  const displayLabel = currentRevision || "Choose Revision";

  return (
    <div ref={rootRef} className="d-inline-block position-relative">
      <a
        className="revision-picker mr-3 py-2 btn btn-sm btn-light text-nowrap"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (loading) return;
          setOpen((v) => !v);
        }}
      >
        <img src={`/~icon/${displayIcon}.svg`} alt="" className="icon mr-1" width={14} height={14} />
        <span>{displayLabel}</span>
        <img src="/~icon/arrow.svg" alt="" className="icon rotate-90 ml-1" width={12} height={12} />
      </a>

      {open && (
        <div className="floating dropdown-menu show position-absolute revision-selector p-4" style={{ zIndex: 1050 }}>
          {/* Search input */}
          <div className="d-flex align-items-center mb-3">
            <input
              ref={inputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Input revision"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <img src="/~icon/magnify.svg" alt="" className="icon text-muted" width={14} height={14} />
          </div>

          {/* Tabs */}
          <ul className="nav nav-tabs nav-tabs-line mb-3">
            <li className="nav-item">
              <a
                className={`nav-link${tab === "branches" ? " active" : ""}`}
                href="#"
                onClick={(e) => { e.preventDefault(); setTab("branches"); }}
              >
                Branches
              </a>
            </li>
            <li className="nav-item">
              <a
                className={`nav-link${tab === "tags" ? " active" : ""}`}
                href="#"
                onClick={(e) => { e.preventDefault(); setTab("tags"); }}
              >
                Tags
              </a>
            </li>
          </ul>

          {/* Error */}
          {error && <div className="alert alert-light-danger mb-0 py-2">{error}</div>}

          {/* Loading */}
          {loading && <div className="text-muted text-center py-3">Loading…</div>}

          {/* Items */}
          {!loading && !error && (
            <ul className="items list-unstyled mb-0">
              {filtered.map((name) => {
                const icon = tab === "branches" ? "branch" : "tag";
                const isActive = name === currentRevision;
                return (
                  <li key={name} className="selectable">
                    <a
                      className={`d-flex align-items-center py-1${isActive ? " text-primary font-weight-bold" : ""}`}
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelect(name);
                      }}
                    >
                      <img src={`/~icon/${icon}.svg`} alt="" className="icon mr-2" width={12} height={12} />
                      <span className="text-nowrap">{name}</span>
                    </a>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="alert alert-notice alert-light-warning mb-0">
                  No {tab} found
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
