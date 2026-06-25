import { useCallback, useRef, useState } from "react";
import { Icon } from "../../../components/onedev/Icon";
import { updateIssueTitle, type Issue } from "../../../api/issues";

export interface IssueEditableTitleProps {
  issue: Issue;
  projectPath: string;
  onUpdate: () => void;
}

/**
 * Issue title bar with view/edit toggle, confidential badge, and copy link.
 * Mirrors OneDev IssueEditableTitlePanel.
 * Reference: references/onedev/.../web/component/issue/editabletitle/IssueEditableTitlePanel.html
 */
export function IssueEditableTitle({ issue, projectPath, onUpdate }: IssueEditableTitleProps) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(issue.title);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleEdit = useCallback(() => {
    setTitle(issue.title);
    setEditing(true);
    // focus input after render
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [issue.title]);

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === issue.title) {
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await updateIssueTitle(issue.id, trimmed);
      onUpdate();
    } catch {
      // keep editing on error
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [title, issue.id, issue.title, onUpdate]);

  const handleCancel = useCallback(() => {
    setTitle(issue.title);
    setEditing(false);
  }, [issue.title]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        handleCancel();
      }
    },
    [handleSave, handleCancel],
  );

  const handleCopy = useCallback(async () => {
    const url = `${window.location.origin}/${projectPath}/~issues/${issue.number}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the hidden input
    }
  }, [projectPath, issue.number]);

  if (editing) {
    return (
      <form
        className="flex-grow-1 d-flex align-items-center"
        onSubmit={(e) => {
          e.preventDefault();
          void handleSave();
        }}
      >
        <div className="clearable-wrapper flex-grow-1 mr-3">
          <input
            ref={inputRef}
            type="text"
            className="form-control"
            placeholder="Input title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={saving}
          />
        </div>
        <div className="flex-shrink-0 text-nowrap">
          <button
            type="submit"
            className="btn btn-primary btn-icon mr-1"
            title="Save"
            disabled={saving || !title.trim()}
          >
            <Icon name="tick" className="icon" />
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-icon"
            title="Cancel"
            onClick={handleCancel}
            disabled={saving}
          >
            <Icon name="times" className="icon" />
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="issue-editable-title d-flex align-items-center justify-content-start flex-nowrap flex-grow-1">
      <span className="h5 mb-0 font-weight-bold text-truncate">{issue.title}</span>
      <span className="number ml-2 mr-2 text-muted font-size-lg">
        #{issue.number}
      </span>
      {issue.confidential && (
        <span
          className="text-warning mr-2 flex-shrink-0"
          title="Confidential"
        >
          <Icon name="incognito" className="icon icon-lg" />
        </span>
      )}
      <button
        type="button"
        className="btn btn-xs btn-icon btn-light btn-hover-primary copy flex-shrink-0 mr-2"
        title={copied ? "Copied!" : "Copy issue link"}
        onClick={() => void handleCopy()}
      >
        <Icon name="copy" className="icon" />
      </button>
      <button
        type="button"
        className="btn btn-xs btn-icon btn-light btn-hover-primary edit flex-shrink-0 mr-2"
        title="Edit issue title"
        onClick={handleEdit}
      >
        <Icon name="edit" className="icon" />
      </button>
    </div>
  );
}
