import { useState } from "react";

type CommitOptionPanelProps = {
  /** File name for generating the default commit message. */
  fileName?: string;
  /** Commit action — affects the default message. */
  action?: "add" | "edit" | "delete";
  /** Called when the user clicks Commit. */
  onCommit: (commitMessage: string) => void;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
};

/**
 * CommitOptionPanel — commit message form for blob create/edit/delete.
 * Matches OneDev's CommitOptionPanel.
 *
 * OneDev ref: web/page/project/blob/render/commitoption/CommitOptionPanel.html
 */
export function CommitOptionPanel({ fileName, action = "add", onCommit, onCancel }: CommitOptionPanelProps) {
  const defaultMessage = (() => {
    if (!fileName) {
      return action === "delete" ? "Delete file" : "Add new file";
    }
    switch (action) {
      case "delete":
        return `Delete ${fileName}`;
      case "edit":
        return `Edit ${fileName}`;
      default:
        return `Add ${fileName}`;
    }
  })();
  const [commitMessage, setCommitMessage] = useState(defaultMessage);

  const handleSubmit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    onCommit(commitMessage.trim() || defaultMessage);
  };

  return (
    <div className="commit-option p-4">
      <h5 className="mb-4">Commit Your Change</h5>
      <div className="body">
        <form onSubmit={handleSubmit}>
          <div className="no-autosize mb-4">
            <textarea
              className="form-control"
              rows={6}
              placeholder="Commit message"
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
            />
          </div>
          <input type="submit" value="Commit" className="btn btn-primary mr-1" />
          <input
            type="button"
            value="Cancel"
            className="btn btn-secondary"
            onClick={onCancel}
          />
        </form>
      </div>
    </div>
  );
}
