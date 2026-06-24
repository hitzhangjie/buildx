import { useEffect, useRef, useState, useCallback } from "react";
import { Icon } from "../Icon";
import { fetchBranches, fetchTags } from "../../../api/repositories";
import { fetchProjects } from "../../../api/projects";
import "./revision-selector.css";

interface CompareRevisionPickerProps {
  projectPath: string;
  revision: string;
  onSelect: (revision: string) => void;
}

type Tab = "branches" | "tags";

export function CompareRevisionPicker({
  projectPath,
  revision,
  onSelect,
}: CompareRevisionPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("branches");
  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

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

  useEffect(() => {
    if (open) {
      setQuery("");
      inputRef.current?.focus();
    }
  }, [open]);

  const handleSelect = useCallback(
    (selected: string) => {
      setOpen(false);
      if (selected !== revision) {
        onSelect(selected);
      }
    },
    [onSelect, revision],
  );

  const handleCustomRevision = useCallback(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    handleSelect(trimmed);
  }, [handleSelect, query]);

  const items = tab === "branches" ? branches : tags;
  const filtered = query
    ? items.filter((name) => name.toLowerCase().includes(query.toLowerCase()))
    : items;

  const displayLabel = revision || "Choose Revision";

  return (
    <div ref={rootRef} className="selector d-inline-block position-relative">
      <a
        className="revision btn btn-outline-secondary btn-sm text-nowrap"
        href="#"
        onClick={(e) => {
          e.preventDefault();
          if (loading) return;
          setOpen((v) => !v);
        }}
      >
        <Icon name="branch" className="icon mr-1" />
        <span>{displayLabel}</span>
        <Icon name="arrow" className="icon rotate-90 ml-1" />
      </a>

      {open && (
        <div
          className="floating dropdown-menu show position-absolute revision-selector p-4"
          style={{ zIndex: 1050 }}
        >
          <div className="d-flex align-items-center mb-3">
            <input
              ref={inputRef}
              type="text"
              className="form-control form-control-sm"
              placeholder="Input revision"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleCustomRevision();
                }
              }}
            />
            <Icon name="magnify" className="icon text-muted" />
          </div>

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
            <ul className="items list-unstyled mb-0">
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
                        handleSelect(name);
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
                      handleCustomRevision();
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
        </div>
      )}
    </div>
  );
}
