import { useState, useEffect, useRef } from "react";
import { UserMultiChoice, type UserChoice } from "../UserMultiChoice";

interface PullRequestFilterPanelProps {
  /** Current query string from the list page. */
  currentQuery: string;
  /** Called when the filter changes with the new query string. */
  onQueryChange: (query: string) => void;
}

export function PullRequestFilterPanel({
  currentQuery,
  onQueryChange,
}: PullRequestFilterPanelProps) {
  // Parse initial values from the current query.
  const [statuses, setStatuses] = useState<string[]>(() => {
    const s: string[] = [];
    const lower = currentQuery.toLowerCase();
    if (lower.includes('"status" is "open"') || lower.includes("status is \"open\"")) s.push("OPEN");
    if (lower.includes('"status" is "merged"') || lower.includes("status is \"merged\"")) s.push("MERGED");
    if (lower.includes('"status" is "discarded"') || lower.includes("status is \"discarded\"")) s.push("DISCARDED");
    return s;
  });

  const [submitters, setSubmitters] = useState<UserChoice[]>([]);
  const [assignees, setAssignees] = useState<UserChoice[]>([]);
  const [labels, setLabels] = useState<string[]>([]);
  const [labelInput, setLabelInput] = useState("");
  const [activeSince, setActiveSince] = useState("");
  const [notActiveSince, setNotActiveSince] = useState("");

  const isInitial = useRef(true);

  // Rebuild query and emit whenever any filter changes (skip initial render).
  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    const parts: string[] = [];

    if (statuses.length > 0) {
      if (statuses.length === 1) {
        parts.push(`"Status" is "${statuses[0]}"`);
      } else {
        parts.push(statuses.map((s) => `"Status" is "${s}"`).join(" or "));
      }
    }

    for (const u of submitters) {
      parts.push(`"Submitted By" is "${u.name}"`);
    }

    for (const u of assignees) {
      parts.push(`"Assigned To" is "${u.name}"`);
    }

    for (const l of labels) {
      parts.push(`"Label" is "${l}"`);
    }

    if (activeSince) {
      parts.push(`"Last Activity Date" is since "${activeSince}"`);
    }
    if (notActiveSince) {
      parts.push(`"Last Activity Date" is until "${notActiveSince}"`);
    }

    onQueryChange(parts.join(" and "));
  }, [statuses, submitters, assignees, labels, activeSince, notActiveSince, onQueryChange]);

  const toggleStatus = (status: string) => {
    setStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  const addLabel = () => {
    const trimmed = labelInput.trim();
    if (!trimmed || labels.includes(trimmed)) return;
    setLabels((prev) => [...prev, trimmed]);
    setLabelInput("");
  };

  const removeLabel = (label: string) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  };

  return (
    <div className="pull-request-filter-panel p-3" style={{ minWidth: "320px" }}>
      {/* Status */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Status</div>
        {["OPEN", "MERGED", "DISCARDED"].map((status) => (
          <label key={status} className="d-flex align-items-center mb-1 font-weight-normal">
            <input
              type="checkbox"
              className="mr-2"
              checked={statuses.includes(status)}
              onChange={() => toggleStatus(status)}
            />
            <span className="text-capitalize">{status.toLowerCase()}</span>
          </label>
        ))}
      </div>

      {/* Submitted By */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Submitted By</div>
        <UserMultiChoice
          selected={submitters}
          onChange={(sel) => {
            setSubmitters(sel);
          }}
          placeholder="Search submitter…"
        />
      </div>

      {/* Assigned To */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Assigned To</div>
        <UserMultiChoice
          selected={assignees}
          onChange={(sel) => {
            setAssignees(sel);
            // state change triggers onQueryChange via useEffect
          }}
          placeholder="Search assignee…"
        />
      </div>

      {/* Labels */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Label</div>
        <div className="d-flex flex-wrap align-items-center">
          {labels.map((l) => (
            <span key={l} className="badge badge-light mr-1 mb-1 d-inline-flex align-items-center">
              {l}
              <a
                href="#"
                className="ml-1 text-muted"
                onClick={(e) => {
                  e.preventDefault();
                  removeLabel(l);
                }}
              >
                &times;
              </a>
            </span>
          ))}
        </div>
        <div className="input-group input-group-sm mt-1">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Add label…"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addLabel();
              }
            }}
          />
        </div>
      </div>

      {/* Active Since */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Active Since</div>
        <input
          type="date"
          className="form-control form-control-sm"
          value={activeSince}
          onChange={(e) => {
            setActiveSince(e.target.value);
            // state change triggers onQueryChange via useEffect
          }}
        />
      </div>

      {/* Not Active Since */}
      <div className="mb-3">
        <div className="font-weight-bold mb-2">Not Active Since</div>
        <input
          type="date"
          className="form-control form-control-sm"
          value={notActiveSince}
          onChange={(e) => {
            setNotActiveSince(e.target.value);
            // state change triggers onQueryChange via useEffect
          }}
        />
      </div>
    </div>
  );
}
