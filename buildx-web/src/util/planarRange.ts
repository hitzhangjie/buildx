import type { Text } from "@codemirror/state";

export type PlanarRange = {
  fromRow: number;
  fromColumn: number;
  toRow: number;
  toColumn: number;
  tabWidth?: number;
};

export const SOURCE_POSITION_PREFIX = "source-";

export function planarRangeToString(range: PlanarRange): string {
  const tabWidth = range.tabWidth && range.tabWidth > 0 ? range.tabWidth : 1;
  return `${range.fromRow}.${range.fromColumn}-${range.toRow}.${range.toColumn}-${tabWidth}`;
}

export function sourcePositionFromRange(range: PlanarRange): string {
  return `${SOURCE_POSITION_PREFIX}${planarRangeToString(range)}`;
}

export function parsePlanarRange(value: string): PlanarRange | null {
  const parts = value.split("-");
  if (parts.length < 2 || parts.length > 3) {
    return null;
  }
  const [fromRow, fromColumn] = parts[0].split(".").map(Number);
  const [toRow, toColumn] = parts[1].split(".").map(Number);
  if ([fromRow, fromColumn, toRow, toColumn].some((n) => Number.isNaN(n))) {
    return null;
  }
  const tabWidth = parts.length === 3 ? Number(parts[2]) : 1;
  return { fromRow, fromColumn, toRow, toColumn, tabWidth: Number.isNaN(tabWidth) ? 1 : tabWidth };
}

export function parseSourcePosition(position: string | null | undefined): PlanarRange | null {
  if (!position || !position.startsWith(SOURCE_POSITION_PREFIX)) {
    return null;
  }
  return parsePlanarRange(position.slice(SOURCE_POSITION_PREFIX.length));
}

/** Normalize a CodeMirror selection into OneDev's planar range (0-based lines/chars). */
export function rangeFromSelection(doc: Text, anchor: number, head: number): PlanarRange | null {
  const from = Math.min(anchor, head);
  const to = Math.max(anchor, head);
  if (from === to) {
    return null;
  }

  const fromLine = doc.lineAt(from);
  const toLine = doc.lineAt(to);

  let fromRow = fromLine.number - 1;
  let fromColumn = from - fromLine.from;
  let toRow = toLine.number - 1;
  let toColumn = to - toLine.from;

  if (toColumn === 0 && toRow > fromRow) {
    const prevLine = doc.line(toLine.number - 1);
    toRow = prevLine.number - 1;
    toColumn = prevLine.length;
  }

  return { fromRow, fromColumn, toRow, toColumn, tabWidth: 1 };
}

export function rangeToPositions(
  doc: Text,
  range: PlanarRange,
): { from: number; to: number } {
  const fromLine = doc.line(range.fromRow + 1);
  const toLine = doc.line(range.toRow + 1);
  const from = fromLine.from + range.fromColumn;
  let to = toLine.from + range.toColumn;
  if (to < from) {
    to = from;
  }
  return { from, to };
}
