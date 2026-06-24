/**
 * Commit graph lane layout algorithm, ported from git-vis.
 *
 * Given a list of commits ordered newest-first (as returned by git log),
 * computes column (lane) assignments, parent-child links, and vertical
 * lane segments so that the commit history can be rendered as an SVG
 * graph similar to `git log --graph`.
 */

export interface GraphLayoutNode {
  hash: string;
  row: number; // 0 = newest
  column: number;
  colorIndex: number;
}

export interface GraphLayoutLink {
  childHash: string;
  parentHash: string;
  type: "parent" | "merge";
  parentIndex: number;
}

/** A vertical line segment connecting consecutive commits in the same lane. */
export interface GraphLaneSegment {
  column: number;
  fromRow: number;
  toRow: number;
  colorIndex: number;
}

export interface CommitGraphLayout {
  nodes: GraphLayoutNode[];
  links: GraphLayoutLink[];
  laneSegments: GraphLaneSegment[];
  columnCount: number;
}

/** 8-colour palette matching OneDev's commit graph colours. */
const LANE_COLORS = [
  "#53a8fd", // blue
  "#09c112", // green
  "#ff4242", // red
  "#0252a2", // dark blue
  "#056d0b", // dark green
  "#b00000", // dark red
  "#af29f8", // purple
  "#ee6c1e", // orange
];

export function getLaneColor(colorIndex: number): string {
  return LANE_COLORS[colorIndex % LANE_COLORS.length];
}

function hashesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 7) return false;
  return longer.startsWith(shorter);
}

function findLaneForHash(lanes: (string | null)[], hash: string): number {
  return lanes.findIndex(
    (lane) => lane !== null && hashesMatch(lane, hash),
  );
}

function resolveHash(
  target: string,
  hashes: string[],
): string | null {
  const exact = hashes.find((h) => h === target);
  if (exact) return exact;
  return hashes.find((h) => hashesMatch(h, target)) ?? null;
}

function buildLaneSegments(nodes: GraphLayoutNode[]): GraphLaneSegment[] {
  const byColumn = new Map<number, GraphLayoutNode[]>();
  for (const node of nodes) {
    const list = byColumn.get(node.column) ?? [];
    list.push(node);
    byColumn.set(node.column, list);
  }

  const segments: GraphLaneSegment[] = [];
  for (const [, list] of byColumn) {
    list.sort((a, b) => a.row - b.row);
    for (let i = 0; i < list.length - 1; i++) {
      segments.push({
        column: list[i].column,
        fromRow: list[i].row,
        toRow: list[i + 1].row,
        colorIndex: list[i].colorIndex,
      });
    }
  }
  return segments;
}

export interface CommitLike {
  hash: string;
  parentHashes?: string[];
}

/**
 * Compute lane layout for a list of commits ordered newest-first.
 *
 * The algorithm mirrors the one in git-vis: it walks rows top-to-bottom
 * (newest→oldest), assigns each commit to a column, places its first
 * parent in the same column (straight line), and places merge parents in
 * free columns.  A `reservedColumnByHash` map ensures that merge parents
 * re-appear in the same column when they become a commit later.
 */
export function layoutCommitGraph(commits: CommitLike[]): CommitGraphLayout {
  const commitHashes = commits.map((c) => c.hash);
  const lanes: (string | null)[] = [];
  const laneColorByHash = new Map<string, number>();
  const reservedColumnByHash = new Map<string, number>();
  const nodes: GraphLayoutNode[] = [];
  const links: GraphLayoutLink[] = [];

  for (let row = 0; row < commits.length; row++) {
    const commit = commits[row];

    // 1. Find or assign column for this commit
    let column = findLaneForHash(lanes, commit.hash);
    if (column === -1 && reservedColumnByHash.has(commit.hash)) {
      column = reservedColumnByHash.get(commit.hash)!;
      while (lanes.length <= column) lanes.push(null);
      lanes[column] = commit.hash;
    }
    if (column === -1) {
      column = lanes.length;
      lanes.push(commit.hash);
    }

    if (!laneColorByHash.has(commit.hash)) {
      laneColorByHash.set(commit.hash, column % LANE_COLORS.length);
    }

    nodes.push({
      hash: commit.hash,
      row,
      column,
      colorIndex: laneColorByHash.get(commit.hash)!,
    });

    // Release this column — it may be taken by the first parent below
    lanes[column] = null;

    // 2. Process parents
    const parents = (commit.parentHashes ?? [])
      .map((p) => resolveHash(p, commitHashes))
      .filter((p): p is string => p !== null);

    if (parents.length > 0) {
      // First parent stays in the same lane (straight line)
      const firstParent = parents[0];
      lanes[column] = firstParent;
      laneColorByHash.set(
        firstParent,
        laneColorByHash.get(commit.hash)!,
      );

      links.push({
        childHash: commit.hash,
        parentHash: firstParent,
        type: "parent",
        parentIndex: 0,
      });

      // Additional parents (merge commits) get their own lanes
      for (let i = 1; i < parents.length; i++) {
        const mergeParent = parents[i];
        let mergeCol = findLaneForHash(lanes, mergeParent);
        if (mergeCol === -1) {
          mergeCol = reservedColumnByHash.get(mergeParent) ?? -1;
        }

        if (mergeCol === -1) {
          // Find a free column
          mergeCol = lanes.findIndex((lane) => lane === null);
          if (mergeCol === -1) {
            mergeCol = lanes.length;
            lanes.push(mergeParent);
          } else {
            lanes[mergeCol] = mergeParent;
          }
        } else {
          lanes[mergeCol] = mergeParent;
        }

        reservedColumnByHash.set(mergeParent, mergeCol);
        if (!laneColorByHash.has(mergeParent)) {
          laneColorByHash.set(
            mergeParent,
            mergeCol % LANE_COLORS.length,
          );
        }

        links.push({
          childHash: commit.hash,
          parentHash: mergeParent,
          type: "merge",
          parentIndex: i,
        });
      }
    }

    // Trim trailing null lanes
    while (lanes.length > 0 && lanes[lanes.length - 1] === null) {
      lanes.pop();
    }
  }

  const columnCount = Math.max(1, ...nodes.map((n) => n.column + 1));
  const laneSegments = buildLaneSegments(nodes);

  return { nodes, links, laneSegments, columnCount };
}

/** Horizontal centre of a column (in px). */
export function nodeCenterX(
  column: number,
  laneWidth: number,
  padding: number,
): number {
  return padding + column * laneWidth + laneWidth / 2;
}

/**
 * SVG path for a link between two nodes.
 * Produces an orthogonal "manhattan" path: down from child, across, down to parent.
 */
export function linkPath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const midY = (y1 + y2) / 2;
  return `M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}`;
}
