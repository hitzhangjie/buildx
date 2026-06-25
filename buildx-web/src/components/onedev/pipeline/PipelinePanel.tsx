import { useLayoutEffect, useRef, useState } from "react";
import type { BuildStatus } from "../../../api/builds";
import { BuildStatusIcon } from "../build/BuildStatusIcon";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** A single job in the pipeline DAG. */
export type PipelineJob = {
  name: string;
  /** 0-based column index (parallel jobs share the same column). */
  column: number;
  /** 0-based row index within the column. */
  row: number;
  /** Job names this job depends on. */
  dependencies: string[];
  /** Current build status for this job, if a build exists. */
  status?: BuildStatus;
  /** Build number link target. */
  buildNumber?: number;
};

export type PipelinePanelProps = {
  jobs: PipelineJob[];
  projectPath: string;
  /** The job index string "column-row" that should be highlighted as active. */
  activeJobIndex?: string;
  /** Whether job items are draggable (for build spec editing). */
  sortable?: boolean;
};

/* ------------------------------------------------------------------ */
/*  Layout helpers                                                     */
/* ------------------------------------------------------------------ */

function maxColumn(jobs: PipelineJob[]): number {
  return jobs.reduce((m, j) => Math.max(m, j.column), 0);
}

function jobsByColumn(jobs: PipelineJob[], col: number): PipelineJob[] {
  return jobs
    .filter((j) => j.column === col)
    .sort((a, b) => a.row - b.row);
}

/** Build a map from "column-row" -> PipelineJob. */
function buildJobMap(jobs: PipelineJob[]): Map<string, PipelineJob> {
  const map = new Map<string, PipelineJob>();
  for (const job of jobs) {
    map.set(`${job.column}-${job.row}`, job);
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  SVG line drawing (ported from OneDev pipeline.js)                   */
/* ------------------------------------------------------------------ */

type Point = { x: number; y: number };

const LINE_COLOR_LIGHT = "#D1D3E0";
const LINE_COLOR_DARK = "#535370";
const LINE_COLOR_ACTIVE = "#3699FF";
const LINE_WIDTH = 2;

/** SVG path data for a cubic bezier from `from` to `to`. */
function curvePath(from: Point, to: Point): string {
  const midX = (from.x + to.x) / 2;
  return `M ${from.x},${from.y} C ${midX},${from.y} ${midX},${to.y} ${to.x},${to.y}`;
}

type Edge = {
  from: string; // "column-row"
  to: string;
  active: boolean;
};

function computeEdges(
  jobs: PipelineJob[],
  jobMap: Map<string, PipelineJob>,
  activeJobIndex?: string,
): Edge[] {
  const edges: Edge[] = [];
  const activeSet = new Set<string>();

  // Collect all edges and mark active-related ones
  for (const job of jobs) {
    const toKey = `${job.column}-${job.row}`;
    for (const depName of job.dependencies) {
      // Find the dependency job by name
      let fromKey: string | undefined;
      for (const [key, j] of jobMap) {
        if (j.name === depName) {
          fromKey = key;
          break;
        }
      }
      if (!fromKey) continue;

      const isActive =
        activeJobIndex === toKey || activeJobIndex === fromKey;
      edges.push({ from: fromKey, to: toKey, active: isActive });
      if (isActive) {
        activeSet.add(fromKey);
        activeSet.add(toKey);
      }
    }
  }

  // Mark all edges connected to active job
  if (activeJobIndex) {
    for (const edge of edges) {
      if (edge.from === activeJobIndex || edge.to === activeJobIndex) {
        edge.active = true;
      }
    }
  }

  return edges;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark-mode");
}

interface JobRect {
  key: string;
  right: number;
  left: number;
  top: number;
  bottom: number;
  centerY: number;
}

/** Calculate line path between two job rectangles. */
function computeLinePath(
  fromRect: JobRect,
  toRect: JobRect,
  columnSpacing: number,
  rowSpacing: number,
  hasIntermediate: boolean, // true if there's a job between these two columns on the same row
): { path: string; label?: string } {
  const start: Point = { x: fromRect.right, y: fromRect.centerY };
  const end: Point = { x: toRect.left, y: toRect.centerY };

  if (fromRect.centerY === toRect.centerY || Math.abs(fromRect.centerY - toRect.centerY) < rowSpacing / 4) {
    // Same row
    if (hasIntermediate) {
      // Route above
      const midY = fromRect.top - rowSpacing / 2;
      const leftCurveStop: Point = { x: start.x + columnSpacing, y: midY };
      const rightCurveStart: Point = { x: end.x - columnSpacing, y: midY };

      const parts = [
        curvePath(start, leftCurveStop),
        `L ${rightCurveStart.x},${rightCurveStart.y}`,
        curvePath(rightCurveStart, end),
      ];

      return { path: parts.join(" ").replace(/^M/, "M") };
    }
    // Straight line
    return { path: `M ${start.x},${start.y} L ${end.x},${end.y}` };
  } else if (fromRect.centerY > toRect.centerY) {
    // from is below to
    if (hasIntermediate) {
      const midY = fromRect.top - rowSpacing / 2;
      const leftCurveStop: Point = { x: start.x + columnSpacing, y: midY };
      const rightCurveStart: Point = { x: end.x - columnSpacing, y: midY };

      const parts = [
        curvePath(start, leftCurveStop),
        `L ${rightCurveStart.x},${rightCurveStart.y}`,
        curvePath(rightCurveStart, end),
      ];

      return { path: parts.join(" ").replace(/^M/, "M") };
    }
    // Route: start → right-angle → curve up → end
    const cornerX = end.x - columnSpacing;
    const corner = { x: cornerX, y: start.y };
    return { path: `M ${start.x},${start.y} L ${corner.x},${corner.y} ` + curvePath(corner, end).replace(/^M[^L]+L\s*/, "") };
  } else {
    // from is above to
    if (hasIntermediate) {
      const midY = fromRect.bottom + rowSpacing / 2;
      const leftCurveStop: Point = { x: start.x + columnSpacing, y: midY };
      const rightCurveStart: Point = { x: end.x - columnSpacing, y: midY };

      const parts = [
        curvePath(start, leftCurveStop),
        `L ${rightCurveStart.x},${rightCurveStart.y}`,
        curvePath(rightCurveStart, end),
      ];

      return { path: parts.join(" ").replace(/^M/, "M") };
    }
    // Route: start → right-angle → curve down → end
    const cornerX = end.x - columnSpacing;
    const corner = { x: cornerX, y: start.y };
    return { path: `M ${start.x},${start.y} L ${corner.x},${corner.y} ` + curvePath(corner, end).replace(/^M[^L]+L\s*/, "") };
  }
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function PipelinePanel({
  jobs,
  projectPath,
  activeJobIndex,
  sortable = false,
}: PipelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [, forceRender] = useState(0);

  const jobMap = buildJobMap(jobs);
  const numColumns = maxColumn(jobs) + 1;
  const edges = computeEdges(jobs, jobMap, activeJobIndex);

  // Calculate SVG overlay size
  useLayoutEffect(() => {
    function measure() {
      if (!containerRef.current) return;
      const el = containerRef.current;
      setSvgSize({ width: el.scrollWidth, height: el.scrollHeight });
    }
    measure();
    const obs = new ResizeObserver(measure);
    if (containerRef.current) {
      obs.observe(containerRef.current);
    }
    return () => obs.disconnect();
  }, [jobs]);

  // Redraw when dark mode changes
  useLayoutEffect(() => {
    const handler = () => forceRender((n) => n + 1);
    const obs = new MutationObserver(() => handler());
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
  }, []);

  if (jobs.length === 0) {
    return (
      <div className="text-muted py-5 text-center">
        No jobs defined in build spec.
      </div>
    );
  }

  const lineColor = isDarkMode() ? LINE_COLOR_DARK : LINE_COLOR_LIGHT;

  return (
    <div className="build-pipeline overflow-auto autofit" ref={containerRef}>
      <div className="pipeline position-relative" style={{ minWidth: "fit-content", minHeight: "fit-content" }}>
        {/* Columns */}
        <div className="d-flex">
          {Array.from({ length: numColumns }, (_, col) => {
            const colJobs = jobsByColumn(jobs, col);
            return (
              <div
                key={col}
                className="pipeline-column"
                style={{
                  zIndex: 10,
                  marginLeft: col > 0 ? "6rem" : 0,
                }}
              >
                {colJobs.map((job) => {
                  const key = `${job.column}-${job.row}`;
                  const isActive = activeJobIndex === key;
                  return (
                    <div
                      key={key}
                      id={`pipeline-job-${key}`}
                      className={`pipeline-row ${isActive ? "active" : ""}`}
                      style={{
                        marginBottom: "3rem",
                        borderRadius: "0.42rem",
                        ...(isActive
                          ? { boxShadow: "0 0 0 2px var(--primary)" }
                          : {}),
                      }}
                    >
                      <div className="btn-group" style={{ width: "100%" }}>
                        {job.buildNumber ? (
                          <a
                            href={`/${projectPath}/~builds/${job.buildNumber}`}
                            className="run btn btn-light d-flex align-items-center px-3 py-2"
                            style={{ flexGrow: 1, textAlign: "left" }}
                          >
                            {job.status && (
                              <BuildStatusIcon
                                status={job.status}
                                className="mr-2 flex-shrink-0"
                              />
                            )}
                            <span className="text-truncate">{job.name}</span>
                          </a>
                        ) : (
                          <div
                            className="run btn btn-light d-flex align-items-center px-3 py-2"
                            style={{ flexGrow: 1, textAlign: "left", cursor: "default" }}
                          >
                            {job.status ? (
                              <BuildStatusIcon
                                status={job.status}
                                className="mr-2 flex-shrink-0"
                              />
                            ) : (
                              <span
                                className="mr-2 flex-shrink-0"
                                style={{
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  border: "2px solid var(--muted)",
                                  display: "inline-block",
                                }}
                              />
                            )}
                            <span className="text-truncate">{job.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Add-job button placeholder (for build spec editing) */}
                {sortable && (
                  <div className="pipeline-row add-job" style={{ marginBottom: 0 }}>
                    <button
                      type="button"
                      className="btn btn-light btn-sm w-100 text-muted"
                      disabled
                    >
                      + Add Job
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* SVG dependency lines overlay */}
        {edges.length > 0 && (
          <svg
            className="dependencies"
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: svgSize.width,
              height: svgSize.height,
              pointerEvents: "none",
              overflow: "visible",
            }}
          >
            {edges.map((edge, i) => (
              <path
                key={`${edge.from}-${edge.to}-${i}`}
                d={
                  computeEdgePath(
                    edge.from,
                    edge.to,
                    jobMap,
                    containerRef.current,
                  ) || ""
                }
                fill="none"
                stroke={edge.active ? LINE_COLOR_ACTIVE : lineColor}
                strokeWidth={edge.active ? LINE_WIDTH + 1 : LINE_WIDTH}
                data-from={edge.from}
                data-to={edge.to}
              />
            ))}
          </svg>
        )}
      </div>

      {/* Help text */}
      <div className="font-size-sm text-muted mt-3">
        <svg className="icon icon-sm mr-1" viewBox="0 0 24 24" width="14" height="14">
          <path
            fill="currentColor"
            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"
          />
        </svg>
        Pipeline shows job dependencies defined in the build spec. Arrows
        indicate execution order. Each job runs when all its dependencies
        complete successfully.
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Edge path computation                                              */
/* ------------------------------------------------------------------ */

function computeEdgePath(
  fromKey: string,
  toKey: string,
  jobMap: Map<string, PipelineJob>,
  container: HTMLElement | null,
): string | null {
  if (!container) return null;

  const fromEl = document.getElementById(`pipeline-job-${fromKey}`);
  const toEl = document.getElementById(`pipeline-job-${toKey}`);
  if (!fromEl || !toEl) return null;

  const containerRect = container.getBoundingClientRect();
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();

  const fromJob = jobMap.get(fromKey);
  const toJob = jobMap.get(toKey);
  if (!fromJob || !toJob) return null;

  const columnSpacing = 96; // 6rem in px (approximate)
  const rowSpacing = 48; // 3rem in px (approximate)

  // Check if there are intermediate jobs between these two columns on the same row
  let hasIntermediate = false;
  if (fromJob.row === toJob.row) {
    for (let c = fromJob.column + 1; c < toJob.column; c++) {
      for (const [, job] of jobMap) {
        if (job.column === c && job.row >= fromJob.row) {
          hasIntermediate = true;
          break;
        }
      }
      if (hasIntermediate) break;
    }
  } else {
    // Check for intermediate jobs on the higher row
    const maxRow = Math.max(fromJob.row, toJob.row);
    for (let c = fromJob.column + 1; c < toJob.column; c++) {
      for (const [, job] of jobMap) {
        if (job.column === c && job.row <= maxRow) {
          hasIntermediate = true;
          break;
        }
      }
      if (hasIntermediate) break;
    }
  }

  const from: JobRect = {
    key: fromKey,
    right: fromRect.right - containerRect.left,
    left: fromRect.left - containerRect.left,
    top: fromRect.top - containerRect.top,
    bottom: fromRect.bottom - containerRect.top,
    centerY: fromRect.top + fromRect.height / 2 - containerRect.top,
  };

  const to: JobRect = {
    key: toKey,
    right: toRect.right - containerRect.left,
    left: toRect.left - containerRect.left,
    top: toRect.top - containerRect.top,
    bottom: toRect.bottom - containerRect.top,
    centerY: toRect.top + toRect.height / 2 - containerRect.top,
  };

  return computeLinePath(from, to, columnSpacing, rowSpacing, hasIntermediate).path;
}
