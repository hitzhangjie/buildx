import { useState, useEffect, useRef } from "react";

const PACK_TYPES = [
  "Container Image",
  "NPM",
  "Maven",
  "PyPI",
  "Ruby Gems",
  "NuGet",
  "Helm",
];

interface PackFilterPanelProps {
  /** Current query string from the list page. */
  currentQuery: string;
  /** Called when the filter changes with the new query string. */
  onQueryChange: (query: string) => void;
}

/** Parses a simple `"Field" is "value"` query back into filter state. */
function parseQuery(query: string): {
  types: string[];
  publishedAfter: string;
  publishedBefore: string;
  publishedByProject: string;
  publishedByUser: string;
  label: string;
} {
  const lower = query.toLowerCase();
  const types: string[] = [];
  for (const t of PACK_TYPES) {
    if (lower.includes(`"type" is "${t.toLowerCase()}"`)) {
      types.push(t);
    }
  }

  const afterMatch = query.match(/"Publish Date" is since\s*"([^"]+)"/i);
  const publishedAfter = afterMatch ? afterMatch[1] : "";

  const beforeMatch = query.match(/"Publish Date" is until\s*"([^"]+)"/i);
  const publishedBefore = beforeMatch ? beforeMatch[1] : "";

  const projectMatch = query.match(/"Published By" is project\s*"([^"]+)"/i);
  const publishedByProject = projectMatch ? projectMatch[1] : "";

  const userMatch = query.match(/"Published By" is\s*"([^"]+)"/i);
  const publishedByUser =
    userMatch && !query.includes("project") ? userMatch[1] : "";

  const labelMatch = query.match(/"Label" is\s*"([^"]+)"/i);
  const label = labelMatch ? labelMatch[1] : "";

  return {
    types,
    publishedAfter,
    publishedBefore,
    publishedByProject,
    publishedByUser,
    label,
  };
}

export function PackFilterPanel({
  currentQuery,
  onQueryChange,
}: PackFilterPanelProps) {
  const initial = parseQuery(currentQuery);
  const [types, setTypes] = useState<string[]>(initial.types);
  const [publishedAfter, setPublishedAfter] = useState(initial.publishedAfter);
  const [publishedBefore, setPublishedBefore] = useState(
    initial.publishedBefore,
  );
  const [publishedByProject, setPublishedByProject] = useState(
    initial.publishedByProject,
  );
  const [publishedByUser, setPublishedByUser] = useState(
    initial.publishedByUser,
  );
  const [label, setLabel] = useState(initial.label);

  const isInitial = useRef(true);

  useEffect(() => {
    if (isInitial.current) {
      isInitial.current = false;
      return;
    }

    const parts: string[] = [];

    if (types.length > 0) {
      if (types.length === 1) {
        parts.push(`"Type" is "${types[0]}"`);
      } else {
        parts.push(types.map((t) => `"Type" is "${t}"`).join(" or "));
      }
    }

    if (publishedAfter) {
      parts.push(`"Publish Date" is since "${publishedAfter}"`);
    }
    if (publishedBefore) {
      parts.push(`"Publish Date" is until "${publishedBefore}"`);
    }
    if (publishedByProject) {
      parts.push(`"Published By" is project "${publishedByProject}"`);
    }
    if (publishedByUser) {
      parts.push(`"Published By" is "${publishedByUser}"`);
    }
    if (label) {
      parts.push(`"Label" is "${label}"`);
    }

    onQueryChange(parts.join(" and "));
  }, [
    types,
    publishedAfter,
    publishedBefore,
    publishedByProject,
    publishedByUser,
    label,
    onQueryChange,
  ]);

  const toggleType = (type: string) => {
    setTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  return (
    <div className="pack-filter-panel p-3" style={{ minWidth: "320px" }}>
      {/* Type */}
      <div className="form-group">
        <label className="control-label font-weight-bold">Type</label>
        <div>
          {PACK_TYPES.map((type) => (
            <label
              key={type}
              className="d-flex align-items-center mb-1 font-weight-normal"
            >
              <input
                type="checkbox"
                className="mr-2"
                checked={types.includes(type)}
                onChange={() => toggleType(type)}
              />
              {type}
            </label>
          ))}
        </div>
      </div>

      {/* Published After */}
      <div className="form-group">
        <label className="control-label font-weight-bold">Published After</label>
        <div className="clearable-wrapper">
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ maxWidth: "14rem" }}
            value={publishedAfter}
            onChange={(e) => setPublishedAfter(e.target.value)}
          />
        </div>
      </div>

      {/* Published Before */}
      <div className="form-group">
        <label className="control-label font-weight-bold">
          Published Before
        </label>
        <div className="clearable-wrapper">
          <input
            type="date"
            className="form-control form-control-sm"
            style={{ maxWidth: "14rem" }}
            value={publishedBefore}
            onChange={(e) => setPublishedBefore(e.target.value)}
          />
        </div>
      </div>

      {/* Published By Project */}
      <div className="form-group">
        <label className="control-label font-weight-bold">
          Published By Project
        </label>
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ maxWidth: "14rem" }}
          placeholder="Project path…"
          value={publishedByProject}
          onChange={(e) => setPublishedByProject(e.target.value)}
        />
      </div>

      {/* Published By User */}
      <div className="form-group">
        <label className="control-label font-weight-bold">
          Published By User
        </label>
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ maxWidth: "14rem" }}
          placeholder="User name…"
          value={publishedByUser}
          onChange={(e) => setPublishedByUser(e.target.value)}
        />
      </div>

      {/* Label */}
      <div className="form-group">
        <label className="control-label font-weight-bold">Label</label>
        <input
          type="text"
          className="form-control form-control-sm"
          style={{ maxWidth: "14rem" }}
          placeholder="Label name…"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
      </div>
    </div>
  );
}
