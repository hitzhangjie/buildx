import {
  useMemo,
  useRef,
  useEffect,
  useLayoutEffect,
  useState,
  useCallback,
} from "react";
import { Link } from "react-router-dom";
import type { RepositoryCommit } from "../../api/repositories";
import {
  layoutCommitGraph,
  getLaneColor,
  linkPath,
  type CommitGraphLayout,
  type GraphLayoutNode,
} from "../../util/commitGraphLayout";
import { formatWhen, formatDate } from "../../util/time";
import { Icon } from "./Icon";
import styles from "./CommitHistoryGraph.module.css";

// ── Layout constants ──

const LANE_WIDTH = 16;
const GRAPH_PADDING = 8;

// ── Helpers ──

/** Format a Unix-millisecond timestamp as a date string like "2025-06-24". */
function formatDay(ts: number): string {
  return formatDate(ts);
}

interface DateSeparator {
  kind: "date";
  date: string;
}

interface CommitRowData {
  kind: "commit";
  commit: RepositoryCommit;
  node: GraphLayoutNode;
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

  for (const commit of commits) {
    const ts = commit.committer?.when ?? commit.author?.when ?? 0;
    const day = formatDay(ts);

    if (day !== prevDay) {
      rows.push({ kind: "date", date: day });
      prevDay = day;
    }

    const node = nodeByHash.get(commit.hash);
    if (node) {
      rows.push({ kind: "commit", commit, node });
    }
  }

  return rows;
}

interface DotCenter {
  x: number;
  y: number;
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
  const [hoveredHash, setHoveredHash] = useState<string | null>(null);
  const [dotCenters, setDotCenters] = useState<Map<string, DotCenter>>(
    new Map(),
  );
  const [graphHeight, setGraphHeight] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const measureDotPositions = useCallback(() => {
    const body = bodyRef.current;
    if (!body) return;

    const bodyRect = body.getBoundingClientRect();
    const centers = new Map<string, DotCenter>();

    body.querySelectorAll<HTMLElement>("[data-graph-dot]").forEach((el) => {
      const hash = el.dataset.graphDot;
      if (!hash) return;
      const rect = el.getBoundingClientRect();
      centers.set(hash, {
        x: rect.left - bodyRect.left + rect.width / 2,
        y: rect.top - bodyRect.top + rect.height / 2,
      });
    });

    setDotCenters(centers);
    setGraphHeight(body.offsetHeight);
  }, []);

  const layout = useMemo(
    () => layoutCommitGraph(commits),
    [commits],
  );

  const timeline = useMemo(
    () => buildTimeline(commits, layout),
    [commits, layout],
  );

  const commitRows = useMemo(
    () => timeline.filter((r): r is CommitRowData => r.kind === "commit"),
    [timeline],
  );

  const graphWidth = layout.columnCount * LANE_WIDTH + GRAPH_PADDING * 2;
  const positionsReady =
    dotCenters.size === commitRows.length && commitRows.length > 0;

  useLayoutEffect(() => {
    measureDotPositions();
  }, [timeline, graphWidth, measureDotPositions]);

  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const observer = new ResizeObserver(() => measureDotPositions());
    observer.observe(body);
    return () => observer.disconnect();
  }, [measureDotPositions]);

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

  const getDotCenter = useCallback(
    (hash: string): DotCenter | undefined => dotCenters.get(hash),
    [dotCenters],
  );

  const svgElements = useMemo(() => {
    if (!positionsReady) return [];

    const laneLines = layout.laneSegments.map((seg) => {
      const fromRow = commitRows[seg.fromRow];
      const toRow = commitRows[seg.toRow];
      if (!fromRow || !toRow) return null;

      const from = getDotCenter(fromRow.commit.hash);
      const to = getDotCenter(toRow.commit.hash);
      if (!from || !to) return null;

      return (
        <line
          key={`lane-${seg.column}-${seg.fromRow}-${seg.toRow}`}
          x1={from.x}
          y1={from.y}
          x2={to.x}
          y2={to.y}
          stroke={getLaneColor(seg.colorIndex)}
          strokeWidth={2}
          strokeOpacity={0.3}
        />
      );
    });

    const linkPaths = layout.links
      .map((link) => {
        const from = getDotCenter(link.childHash);
        const to = getDotCenter(link.parentHash);
        if (!from || !to) return null;

        const childNode = layout.nodes.find((n) => n.hash === link.childHash);
        const isMerge = link.type === "merge";

        return (
          <path
            key={`link-${link.childHash}-${link.parentHash}-${link.parentIndex}`}
            d={linkPath(from.x, from.y, to.x, to.y)}
            fill="none"
            stroke={
              isMerge
                ? "#e36209"
                : getLaneColor(childNode?.colorIndex ?? 0)
            }
            strokeWidth={isMerge ? 2 : 1.5}
            strokeOpacity={isMerge ? 0.85 : 0.55}
          />
        );
      })
      .filter(Boolean);

    return [...laneLines, ...linkPaths];
  }, [layout, commitRows, positionsReady, getDotCenter]);

  return (
    <div className={styles.historyGraph}>
      <div ref={bodyRef} className={styles.graphBody}>
        <svg
          className={styles.graphLines}
          width={graphWidth}
          height={graphHeight}
          aria-hidden
        >
          {svgElements}
        </svg>

        <ul ref={listRef} className={styles.commitList}>
          {timeline.map((row) => {
            if (row.kind === "date") {
              return (
                <li key={`date-${row.date}`} className={styles.dateRow}>
                  <div
                    className={styles.graphCell}
                    style={{ width: graphWidth }}
                    aria-hidden
                  />
                  <div className={styles.listCell}>
                    <Icon name="calendar" className={styles.dateIcon} />
                    {row.date}
                  </div>
                </li>
              );
            }

            const { commit, node } = row;
            const subject = commit.subject || commit.hash.slice(0, 8);
            const authorName = commit.author?.name ?? "Unknown";
            const when = commit.committer?.when ?? commit.author?.when ?? 0;
            const relativeTime = formatWhen(when);
            const color = getLaneColor(node.colorIndex);
            const isHovered = hoveredHash === commit.hash;

            return (
              <li
                key={commit.hash}
                className={`commit ${styles.commitRow}`}
                data-commit-hash={commit.hash}
                onMouseEnter={() => setHoveredHash(commit.hash)}
                onMouseLeave={() => setHoveredHash(null)}
              >
                <div
                  className={styles.graphCell}
                  style={{ width: graphWidth }}
                >
                  <div
                    className={`${styles.graphDot} ${isHovered ? styles.graphDotHovered : ""}`}
                    data-graph-dot={commit.hash}
                    style={{
                      backgroundColor: color,
                      left: GRAPH_PADDING + node.column * LANE_WIDTH + LANE_WIDTH / 2,
                    }}
                    onMouseEnter={() => setHoveredHash(commit.hash)}
                    onMouseLeave={() => setHoveredHash(null)}
                  />
                </div>
                <div className={styles.listCell}>
                  <Link
                    to={`/${projectPath}/~commits/${commit.hash}`}
                    className={styles.commitInfo}
                    style={{
                      textDecoration: "none",
                      color: "inherit",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <div className={styles.commitPrimary}>
                      <span className={styles.commitSubject}>{subject}</span>
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
                </div>
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
