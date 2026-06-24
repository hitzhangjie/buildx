import { useMemo, useRef, useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import type { RepositoryCommit } from "../../api/repositories";
import {
  layoutCommitGraph,
  getLaneColor,
  linkPath,
  nodeCenterX,
  type CommitGraphLayout,
  type GraphLayoutNode,
} from "../../util/commitGraphLayout";
import { formatWhen, formatDate } from "../../util/time";
import { Icon } from "./Icon";
import styles from "./CommitHistoryGraph.module.css";

// ── Layout constants ──

const LANE_WIDTH = 16;
const GRAPH_PADDING = 8;
const DOT_RADIUS = 4;

/** Fixed row height for commit rows (kept consistent via CSS). */
const ROW_HEIGHT = 52;
/** Fixed height for date separator rows. */
const DATE_ROW_HEIGHT = 48;
/** Extra graph height at the bottom so the last dot isn't clipped. */
const GRAPH_BOTTOM_PAD = 20;

// ── View mode ──

export type CommitHistoryViewMode = "graph" | "list";

const VIEW_MODE_KEY = "buildx-commit-history-view";

function loadViewMode(): CommitHistoryViewMode {
  try {
    const v = localStorage.getItem(VIEW_MODE_KEY);
    if (v === "graph" || v === "list") return v;
  } catch {
    /* ignore */
  }
  return "graph";
}

function saveViewMode(mode: CommitHistoryViewMode) {
  try {
    localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    /* ignore */
  }
}

// ── Helpers ──

/** Format a Unix-millisecond timestamp as a date string like "2025-06-24". */
function formatDay(ts: number): string {
  return formatDate(ts);
}

/**
 * Group commits by committer date and return an array of rows.
 * Each row is either a DateSeparator or a CommitRow.
 */
interface DateSeparator {
  kind: "date";
  date: string;
}

interface CommitRowData {
  kind: "commit";
  commit: RepositoryCommit;
  node: GraphLayoutNode;
  /** Cumulative Y offset (px) from the top of the list. */
  topY: number;
}

type TimelineRow = DateSeparator | CommitRowData;

function buildTimeline(
  commits: RepositoryCommit[],
  layout: CommitGraphLayout,
): TimelineRow[] {
  const nodeByHash = new Map<string, GraphLayoutNode>();
  for (const n of layout.nodes) {
    nodeByHash.set(n.hash, n);
  }

  const rows: TimelineRow[] = [];
  let prevDay = "";
  let y = 0;

  for (const commit of commits) {
    const ts = commit.committer?.when ?? commit.author?.when ?? 0;
    const day = formatDay(ts);

    if (day !== prevDay) {
      rows.push({ kind: "date", date: day });
      y += DATE_ROW_HEIGHT;
      prevDay = day;
    }

    const node = nodeByHash.get(commit.hash);
    if (node) {
      rows.push({ kind: "commit", commit, node, topY: y });
      y += ROW_HEIGHT;
    }
  }

  return rows;
}

// ── Props ──

interface CommitHistoryGraphProps {
  commits: RepositoryCommit[];
  projectPath: string;
}

// ── Component ──

export function CommitHistoryGraph({
  commits,
  projectPath,
}: CommitHistoryGraphProps) {
  const [viewMode, setViewMode] = useState<CommitHistoryViewMode>(loadViewMode);
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const toggleView = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === "graph" ? "list" : "graph";
      saveViewMode(next);
      return next;
    });
  }, []);

  // Compute the lane layout once
  const layout = useMemo(
    () => layoutCommitGraph(commits),
    [commits],
  );

  // Build the timeline with cumulative Y offsets
  const timeline = useMemo(
    () => buildTimeline(commits, layout),
    [commits, layout],
  );

  // Extract just the commit rows for quick access
  const commitRows = useMemo(
    () => timeline.filter((r): r is CommitRowData => r.kind === "commit"),
    [timeline],
  );

  // Total graph height
  const totalHeight =
    commitRows.length > 0
      ? commitRows[commitRows.length - 1].topY + ROW_HEIGHT + GRAPH_BOTTOM_PAD
      : 0;

  const graphWidth = layout.columnCount * LANE_WIDTH + GRAPH_PADDING * 2;

  // ── Sync hover state: highlight matching list item & dot ──
  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>("li.commit");
    for (const item of items) {
      const hash = item.dataset.commitHash;
      if (hash === hoveredHash) {
        item.classList.add(styles.commitRowHover);
      } else {
        item.classList.remove(styles.commitRowHover);
      }
    }
  }, [hoveredHash]);

  // ── Build SVG elements ──

  const svgElements = useMemo(() => {
    if (viewMode !== "graph") return null;

    const nodeByHash = new Map<string, GraphLayoutNode>();
    for (const n of layout.nodes) nodeByHash.set(n.hash, n);

    // Helper: get Y centre of a commit row
    const rowCY = (topY: number) => topY + ROW_HEIGHT / 2;

    // Lane segments (vertical lines through nodes)
    const laneLines = layout.laneSegments.map((seg) => {
      const fromRow = commitRows[seg.fromRow];
      const toRow = commitRows[seg.toRow];
      if (!fromRow || !toRow) return null;
      const x = nodeCenterX(seg.column, LANE_WIDTH, GRAPH_PADDING);
      const y1 = rowCY(fromRow.topY);
      const y2 = rowCY(toRow.topY);
      return (
        <line
          key={`lane-${seg.column}-${seg.fromRow}-${seg.toRow}`}
          x1={x}
          y1={y1}
          x2={x}
          y2={y2}
          stroke={getLaneColor(seg.colorIndex)}
          strokeWidth={2}
          strokeOpacity={0.3}
        />
      );
    });

    // Parent-child links
    const linkPaths = layout.links
      .map((link) => {
        const child = nodeByHash.get(link.childHash);
        const parent = nodeByHash.get(link.parentHash);
        if (!child || !parent) return null;
        const childRow = commitRows[child.row];
        const parentRow = commitRows[parent.row];
        if (!childRow || !parentRow) return null;

        const x1 = nodeCenterX(child.column, LANE_WIDTH, GRAPH_PADDING);
        const y1 = rowCY(childRow.topY);
        const x2 = nodeCenterX(parent.column, LANE_WIDTH, GRAPH_PADDING);
        const y2 = rowCY(parentRow.topY);
        const isMerge = link.type === "merge";

        return (
          <path
            key={`link-${link.childHash}-${link.parentHash}-${link.parentIndex}`}
            d={linkPath(x1, y1, x2, y2)}
            fill="none"
            stroke={isMerge ? "#e36209" : getLaneColor(child.colorIndex)}
            strokeWidth={isMerge ? 2 : 1.5}
            strokeOpacity={isMerge ? 0.85 : 0.55}
          />
        );
      })
      .filter(Boolean);

    // Commit dots
    const dots = commitRows.map((row) => {
      const node = row.node;
      const cx = nodeCenterX(node.column, LANE_WIDTH, GRAPH_PADDING);
      const cy = rowCY(row.topY);
      const color = getLaneColor(node.colorIndex);
      const isHovered = hoveredHash === node.hash;

      return (
        <circle
          key={node.hash}
          cx={cx}
          cy={cy}
          r={isHovered ? 6 : DOT_RADIUS}
          fill={color}
          stroke="#fff"
          strokeWidth={isHovered ? 2.5 : 1.5}
          style={{ transition: "r 0.15s, stroke-width 0.15s" }}
          onMouseEnter={() => setHoveredHash(node.hash)}
          onMouseLeave={() => setHoveredHash(null)}
        />
      );
    });

    return [...laneLines, ...linkPaths, ...dots];
  }, [viewMode, layout, commitRows, hoveredHash]);

  // ── Render ──

  return (
    <div className={styles.historyGraph}>
      {/* View toggle bar */}
      <div className={styles.viewBar}>
        <div className={styles.viewToggle} role="group" aria-label="View mode">
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${
              viewMode === "graph" ? styles.viewToggleBtnActive : ""
            }`}
            onClick={() => viewMode !== "graph" && toggleView()}
          >
            Graph
          </button>
          <button
            type="button"
            className={`${styles.viewToggleBtn} ${
              viewMode === "list" ? styles.viewToggleBtnActive : ""
            }`}
            onClick={() => viewMode !== "list" && toggleView()}
          >
            List
          </button>
        </div>
        <span className="text-muted font-size-sm">
          {commits.length} commits
        </span>
      </div>

      {/* Graph + list body */}
      <div className={styles.graphBody}>
        {/* SVG graph lane (absolutely positioned) */}
        {viewMode === "graph" && (
          <div className={styles.graphLane} style={{ width: graphWidth }}>
            <svg
              className={styles.graphSvg}
              width={graphWidth}
              height={totalHeight}
              aria-hidden
            >
              {svgElements}
            </svg>
          </div>
        )}

        {/* Commit list */}
        <ul
          ref={listRef}
          className={styles.commitList}
          style={
            viewMode === "graph"
              ? { marginLeft: graphWidth + 12 }
              : undefined
          }
        >
          {timeline.map((row) => {
            if (row.kind === "date") {
              return (
                <li key={`date-${row.date}`} className={styles.dateRow}>
                  <Icon name="calendar" className={styles.dateIcon} />
                  {row.date}
                </li>
              );
            }

            const { commit } = row;
            const subject = commit.subject || commit.hash.slice(0, 8);
            const authorName = commit.author?.name ?? "Unknown";
            const when = commit.committer?.when ?? commit.author?.when ?? 0;
            const relativeTime = formatWhen(when);

            return (
              <li
                key={commit.hash}
                className={`commit ${styles.commitRow}`}
                data-commit-hash={commit.hash}
                onMouseEnter={() => setHoveredHash(commit.hash)}
                onMouseLeave={() => setHoveredHash(null)}
              >
                <Link
                  to={`/${projectPath}/~commits/${commit.hash}`}
                  className={styles.commitInfo}
                  style={{ textDecoration: "none", color: "inherit", flex: 1, minWidth: 0 }}
                >
                  <div className={styles.commitPrimary}>
                    <span className={styles.commitSubject}>
                      {subject}
                    </span>
                    <span className={styles.commitHash}>
                      {commit.hash.slice(0, 8)}
                    </span>
                  </div>
                  <div className={styles.commitMeta}>
                    <span className={styles.commitAuthor}>
                      <Icon name="user" /> {authorName}
                    </span>
                    <span className={styles.commitWhen}>{relativeTime}</span>
                  </div>
                </Link>
              </li>
            );
          })}

          {commitRows.length === 0 && (
            <li className="text-center text-muted py-5">No commits found</li>
          )}
        </ul>
      </div>
    </div>
  );
}
