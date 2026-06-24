export type DiffViewMode = "UNIFIED" | "SPLIT";

export const DIFF_VIEW_MODE_KEY = "onedev.server.diff.viewmode";

export type SplitDiffRow = {
  left: string;
  right: string;
  leftType: "context" | "delete" | "empty";
  rightType: "context" | "add" | "empty";
};

/** Parse a unified diff body into side-by-side rows (per hunk). */
export function parseSplitDiffRows(diff: string): SplitDiffRow[] {
  const rows: SplitDiffRow[] = [];
  const lines = diff.split("\n");
  let hunkLines: string[] = [];

  function flushHunk() {
    if (hunkLines.length === 0) {
      return;
    }
    const left: string[] = [];
    const right: string[] = [];
    const leftTypes: SplitDiffRow["leftType"][] = [];
    const rightTypes: SplitDiffRow["rightType"][] = [];

    for (const line of hunkLines) {
      if (line.startsWith("-")) {
        left.push(line.slice(1));
        leftTypes.push("delete");
        right.push("");
        rightTypes.push("empty");
      } else if (line.startsWith("+")) {
        left.push("");
        leftTypes.push("empty");
        right.push(line.slice(1));
        rightTypes.push("add");
      } else if (line.startsWith(" ")) {
        const content = line.slice(1);
        left.push(content);
        right.push(content);
        leftTypes.push("context");
        rightTypes.push("context");
      }
    }

    for (let i = 0; i < left.length; i++) {
      rows.push({
        left: left[i],
        right: right[i],
        leftType: leftTypes[i],
        rightType: rightTypes[i],
      });
    }
    hunkLines = [];
  }

  for (const line of lines) {
    if (line.startsWith("@@")) {
      flushHunk();
      continue;
    }
    if (
      line.startsWith("diff --git") ||
      line.startsWith("---") ||
      line.startsWith("+++") ||
      line.startsWith("index ") ||
      line.startsWith("\\ No newline")
    ) {
      continue;
    }
    if (line.startsWith("+") || line.startsWith("-") || line.startsWith(" ")) {
      hunkLines.push(line);
    }
  }
  flushHunk();
  return rows;
}

export function readDiffViewMode(): DiffViewMode {
  const stored = localStorage.getItem(DIFF_VIEW_MODE_KEY);
  return stored === "SPLIT" ? "SPLIT" : "UNIFIED";
}

export function writeDiffViewMode(mode: DiffViewMode): void {
  localStorage.setItem(DIFF_VIEW_MODE_KEY, mode);
}
