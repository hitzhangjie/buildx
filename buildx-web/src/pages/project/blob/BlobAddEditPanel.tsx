import { useState, useMemo } from "react";
import { CodeEditor } from "../../../components/onedev/CodeEditor";
import { CommitOptionPanel } from "./CommitOptionPanel";
import "./BlobAddEditPanel.css";

type TabName = "edit" | "changes" | "save";

type BlobAddEditPanelProps = {
  /** Current file path being edited (empty string for new files without a name yet). */
  filePath: string;
  /** Initial content — empty string for new files. */
  initialContent: string;
  /** The revision/branch being committed to. */
  revision: string;
  /** Called when the user clicks Cancel. */
  onCancel: () => void;
  /** Called when the user commits (with commit message). */
  onCommit: (commitMessage: string, content: string) => void;
};

/**
 * BlobAddEditPanel — the code editing panel for creating or editing files.
 * Matches OneDev's BlobEditPanel layout:
 *   - Tab bar: Edit | Changes | Save | Cancel
 *   - Body: form (editor) / changes-viewer / commit-options
 *
 * OneDev ref: web/page/project/blob/render/edit/BlobEditPanel.html
 */
export function BlobAddEditPanel({
  filePath,
  initialContent,
  revision: _revision,
  onCancel,
  onCommit,
}: BlobAddEditPanelProps) {
  const [activeTab, setActiveTab] = useState<TabName>("edit");
  const [editingContent, setEditingContent] = useState(initialContent);

  const fileName = filePath.split("/").pop() || "";

  const changesDiff = useMemo(() => {
    if (activeTab !== "changes") return null;
    return computeDiff(initialContent, editingContent);
  }, [activeTab, initialContent, editingContent]);

  const handleCommit = (commitMessage: string) => {
    onCommit(commitMessage, editingContent);
  };

  return (
    <div className="blob-edit d-flex flex-column flex-grow-1">
      {/* Tab bar */}
      <div className="head d-flex align-items-stretch px-3 flex-shrink-0 border-bottom">
        <div className={`tab edit mr-4 d-flex align-items-stretch${activeTab === "edit" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTab("edit"); }}
          >
            <img src="/~icon/edit.svg" className="icon mr-1" width={16} height={16} alt="" />
            Edit
          </a>
        </div>
        <div className={`tab changes mr-4 d-flex align-items-stretch${activeTab === "changes" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTab("changes"); }}
          >
            <img src="/~icon/diff2.svg" className="icon mr-1" width={16} height={16} alt="" />
            Changes
          </a>
        </div>
        <div className={`save tab mr-4 d-flex align-items-stretch${activeTab === "save" ? " active" : ""}`}>
          <a
            className="d-flex align-items-center font-weight-bold"
            href="#"
            onClick={(e) => { e.preventDefault(); setActiveTab("save"); }}
          >
            <img src="/~icon/save.svg" className="icon mr-1" width={16} height={16} alt="" />
            Save
          </a>
        </div>
        <div className="cancel mr-4 d-flex align-items-center">
          <a href="#" onClick={(e) => { e.preventDefault(); onCancel(); }}>
            Cancel
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="body flex-grow-1 d-flex flex-column">
        {/* Edit tab: CodeMirror editor */}
        <div
          className={activeTab === "edit" ? "d-flex flex-grow-1 flex-column" : "d-none"}
          style={{ minHeight: 0 }}
        >
          <CodeEditor
            value={editingContent}
            onChange={setEditingContent}
            filePath={filePath}
          />
        </div>

        {/* Changes tab: diff view */}
        <div className={activeTab === "changes" ? "changes-viewer flex-grow-1 flex-column autofit p-4 overflow-auto" : "d-none"}>
          {changesDiff ? (
            <pre className="diff-view font-size-sm mb-0">{changesDiff}</pre>
          ) : (
            <div className="text-muted">No changes</div>
          )}
        </div>

        {/* Save tab: commit options */}
        <div className={activeTab === "save" ? "commit-options flex-grow-1 d-flex flex-column autofit" : "d-none"}>
          <CommitOptionPanel
            fileName={fileName}
            onCommit={handleCommit}
            onCancel={onCancel}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Simple line diff between old and new content.
 * Shows added lines with "+" prefix in green, removed lines with "-" prefix in red.
 */
function computeDiff(oldContent: string, newContent: string): string {
  const oldLines = oldContent ? oldContent.split("\n") : [];
  const newLines = newContent ? newContent.split("\n") : [];

  // Simple LCS-based diff for small files
  const result: string[] = [];
  const lcs = longestCommonSubsequence(oldLines, newLines);

  let oi = 0, ni = 0, li = 0;
  while (oi < oldLines.length || ni < newLines.length) {
    if (li < lcs.length) {
      // Output removals before the next LCS line
      while (oi < oldLines.length && oldLines[oi] !== lcs[li]) {
        result.push(`- ${oldLines[oi]}`);
        oi++;
      }
      // Output additions before the next LCS line
      while (ni < newLines.length && newLines[ni] !== lcs[li]) {
        result.push(`+ ${newLines[ni]}`);
        ni++;
      }
      // Output the common line
      result.push(`  ${lcs[li]}`);
      oi++;
      ni++;
      li++;
    } else {
      // Remaining lines after last LCS match
      while (oi < oldLines.length) {
        result.push(`- ${oldLines[oi]}`);
        oi++;
      }
      while (ni < newLines.length) {
        result.push(`+ ${newLines[ni]}`);
        ni++;
      }
    }
  }
  return result.join("\n");
}

function longestCommonSubsequence(a: string[], b: string[]): string[] {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to reconstruct LCS
  const result: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      result.unshift(a[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }
  return result;
}
