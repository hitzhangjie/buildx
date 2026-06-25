import { useCallback, useEffect, useState } from "react";
import { Icon } from "./Icon";
import { Select2SingleChoice } from "./Select2SingleChoice";
import { Select2MultiChoice } from "./Select2MultiChoice";
import { fetchBranches, fetchTags } from "../../api/repositories";
import styles from "./CommitFilterPanel.module.css";

// ── Filter state ──

export interface CommitFilterState {
  branches: string[];
  tag: string;
  touchedFile: string;
  authoredBy: string[];
  committedBy: string[];
  committedAfter: string;
  committedBefore: string;
}

export const EMPTY_FILTER: CommitFilterState = {
  branches: [],
  tag: "",
  touchedFile: "",
  authoredBy: [],
  committedBy: [],
  committedAfter: "",
  committedBefore: "",
};

// ── Query string generation ──

/**
 * Build a OneDev-style commit query string from filter selections.
 * Segment order: revision criteria, then property criteria.
 */
export function buildCommitQueryString(f: CommitFilterState): string {
  const parts: string[] = [];

  for (const branch of f.branches) {
    parts.push(`until branch(${branch})`);
  }
  if (f.branches.length > 1) {
    parts.push("order-by-topo");
  }
  if (f.tag) {
    parts.push(`until tag(${f.tag})`);
  }
  if (f.touchedFile) {
    parts.push(`path(${f.touchedFile})`);
  }
  for (const a of f.authoredBy) {
    parts.push(`author(${a})`);
  }
  for (const c of f.committedBy) {
    parts.push(`committer(${c})`);
  }
  if (f.committedAfter) {
    parts.push(`after(${f.committedAfter})`);
  }
  if (f.committedBefore) {
    parts.push(`before(${f.committedBefore})`);
  }

  return parts.join(" ");
}

/** Extract `until branch(...)` names from a commit query string. */
export function parseUntilBranches(query: string): string[] {
  const branches: string[] = [];
  const re = /\buntil\s+branch\(([^)]+)\)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(query)) !== null) {
    branches.push(match[1].trim());
  }
  return branches;
}

// ── Props ──

export interface CommitFilterPanelProps {
  /** Called with updated filter state on any change. */
  onChange: (state: CommitFilterState) => void;
  /** Project ID for fetching branch/tag lists. */
  projectId: number;
}

// ── Component ──

/**
 * Commit filter panel — manages its own state internally so that parent
 * re-renders (e.g. from query-string updates) don't reset the inputs.
 */
export function CommitFilterPanel({
  onChange,
  projectId,
}: CommitFilterPanelProps) {
  const [state, setState] = useState<CommitFilterState>(EMPTY_FILTER);
  const [branches, setBranches] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  // Fetch branch and tag lists.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [b, t] = await Promise.all([
          fetchBranches(projectId),
          fetchTags(projectId),
        ]);
        if (!cancelled) {
          setBranches(b);
          setTags(t);
        }
      } catch {
        // Silently ignore — lists stay empty.
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [projectId]);

  const update = useCallback(
    (patch: Partial<CommitFilterState>) => {
      setState((prev) => {
        const next = { ...prev, ...patch };
        onChange(next);
        return next;
      });
    },
    [onChange],
  );

  return (
    <div className={styles.filterPanel}>
      <div className={styles.hint}>
        <Icon name="bulb" className={styles.hintIcon} />
        Below are some common criterias. Type in search box above to view the
        complete list and available combinations.
      </div>

      {/* Branch */}
      <div className="form-group">
        <label className="control-label">Branch</label>
        <Select2MultiChoice
          values={state.branches}
          onChange={(v) => update({ branches: v })}
          choices={branches}
          placeholder="Any branch"
          checkboxList
        />
      </div>

      {/* Tag */}
      <div className="form-group">
        <label className="control-label">Tag</label>
        <Select2SingleChoice
          value={state.tag}
          onChange={(v) => update({ tag: v })}
          choices={tags}
          placeholder="Any tag"
        />
      </div>

      {/* Touched File */}
      <div className="form-group">
        <label className="control-label">Touched File</label>
        <div className="clearable-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="e.g. src/main/*.go"
            value={state.touchedFile}
            onChange={(e) => update({ touchedFile: e.target.value })}
          />
        </div>
      </div>

      {/* Authored By */}
      <div className="form-group">
        <label className="control-label">Authored By</label>
        <Select2MultiChoice
          values={state.authoredBy}
          onChange={(v) => update({ authoredBy: v })}
          choices={[]}
          placeholder="Any author"
        />
      </div>

      {/* Committed By */}
      <div className="form-group">
        <label className="control-label">Committed By</label>
        <Select2MultiChoice
          values={state.committedBy}
          onChange={(v) => update({ committedBy: v })}
          choices={[]}
          placeholder="Any committer"
        />
      </div>

      {/* Committed After */}
      <div className="form-group">
        <label className="control-label">Committed After</label>
        <div className="clearable-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="e.g. 3 days ago"
            value={state.committedAfter}
            onChange={(e) => update({ committedAfter: e.target.value })}
          />
        </div>
      </div>

      {/* Committed Before */}
      <div className="form-group">
        <label className="control-label">Committed Before</label>
        <div className="clearable-wrapper">
          <input
            type="text"
            className="form-control"
            placeholder="e.g. yesterday"
            value={state.committedBefore}
            onChange={(e) => update({ committedBefore: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
