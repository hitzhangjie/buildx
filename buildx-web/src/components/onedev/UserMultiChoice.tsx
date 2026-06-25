import { useEffect, useState, useRef, useCallback } from "react";
import { Icon } from "./Icon";
import { apiFetch } from "../../api/client";

export interface UserChoice {
  id: number;
  name: string;
  fullName: string;
}

interface UserMultiChoiceProps {
  selected: UserChoice[];
  onChange: (selected: UserChoice[]) => void;
  placeholder?: string;
}

export function UserMultiChoice({
  selected,
  onChange,
  placeholder = "Search users…",
}: UserMultiChoiceProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserChoice[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch users when query changes.
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    apiFetch<UserChoice[]>(`/~api/users?query=${encodeURIComponent(trimmed)}`)
      .then((users) => {
        if (!cancelled) setResults(Array.isArray(users) ? users : []);
      })
      .catch(() => {
        if (!cancelled) setResults([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, open]);

  // Close on outside click.
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

  const toggleUser = useCallback(
    (user: UserChoice) => {
      const exists = selected.some((s) => s.id === user.id);
      if (exists) {
        onChange(selected.filter((s) => s.id !== user.id));
      } else {
        onChange([...selected, user]);
      }
      setOpen(false);
      setQuery("");
    },
    [selected, onChange],
  );

  const removeUser = useCallback(
    (userId: number) => {
      onChange(selected.filter((s) => s.id !== userId));
    },
    [selected, onChange],
  );

  return (
    <div ref={rootRef} className="user-multi-choice position-relative">
      {/* Selected chips + input */}
      <div className="d-flex flex-wrap align-items-center border rounded p-1" style={{ minHeight: "34px" }}>
        {selected.map((u) => (
          <span key={u.id} className="badge badge-light mr-1 mb-1 d-inline-flex align-items-center">
            <span>{u.name}</span>
            <a
              href="#"
              className="ml-1 text-muted"
              onClick={(e) => {
                e.preventDefault();
                removeUser(u.id);
              }}
            >
              &times;
            </a>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          className="border-0 flex-grow-1"
          style={{ minWidth: "120px", outline: "none" }}
          placeholder={selected.length === 0 ? placeholder : ""}
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Icon name="magnify" className="text-muted mr-1" />
      </div>

      {/* Dropdown */}
      {open && (
        <div
          className="floating dropdown-menu show position-absolute w-100 p-2"
          style={{ zIndex: 1060, maxHeight: "240px", overflowY: "auto" }}
        >
          {loading && <div className="text-muted text-center py-2">Searching…</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div className="text-muted text-center py-2">No users found</div>
          )}
          {results.map((u) => {
            const isSelected = selected.some((s) => s.id === u.id);
            return (
              <a
                key={u.id}
                className={`dropdown-item d-flex align-items-center${isSelected ? " font-weight-bold" : ""}`}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  toggleUser(u);
                }}
              >
                <span>{u.fullName || u.name}</span>
                <span className="text-muted ml-2 font-size-sm">@{u.name}</span>
                {isSelected && <Icon name="tick" className="ml-auto text-primary" />}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
