import { useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Job } from "../../buildspec/types";
import {
  adjustActiveIndexAfterMove,
  buildDependencyMap,
  buildPipeline,
  flatIndexFromPipeline,
  moveJobInList,
  pipelineJobIndex,
} from "../../buildspec/pipeline";
import { namedElementLabel } from "../../buildspec/types";
import { Icon } from "../onedev/Icon";
import { InlineDropdown } from "../onedev/DropdownMenu";
import { ElementNavRow } from "./ElementNavRow";

const LINE_COLOR_LIGHT = "#D1D3E0";
const LINE_COLOR_DARK = "#535370";
const LINE_COLOR_ACTIVE = "#3699FF";
const LINE_WIDTH = 2;

type Point = { x: number; y: number };

function curvePath(from: Point, to: Point): string {
  const mid = (from.x + to.x) / 2;
  return `M ${from.x},${from.y} C ${mid},${from.y} ${mid},${to.y} ${to.x},${to.y}`;
}

function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark-mode");
}

type BuildSpecPipelinePanelProps = {
  jobs: Job[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onJobsChange: (jobs: Job[]) => void;
  suggestedJobs?: Job[];
  readOnly?: boolean;
  renderJobExtra?: (job: Job, index: number) => ReactNode;
};

export function BuildSpecPipelinePanel({
  jobs,
  activeIndex,
  onActiveIndexChange,
  onJobsChange,
  suggestedJobs = [],
  readOnly = false,
  renderJobExtra,
}: BuildSpecPipelinePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const pipelineId = useRef(`pipeline-${Math.random().toString(36).slice(2)}`).current;
  const [svgSize, setSvgSize] = useState({ width: 0, height: 0 });
  const [, forceRender] = useState(0);

  const pipeline = useMemo(() => buildPipeline(jobs), [jobs]);
  const dependencyMap = useMemo(() => buildDependencyMap(pipeline), [pipeline]);

  const activeKey = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= jobs.length) {
      return undefined;
    }
    const idx = pipelineJobIndex(pipeline, jobs[activeIndex]);
    return idx ? `${idx.column}-${idx.row}` : undefined;
  }, [activeIndex, jobs, pipeline]);

  useLayoutEffect(() => {
    function measure() {
      if (!containerRef.current) {
        return;
      }
      setSvgSize({
        width: containerRef.current.scrollWidth,
        height: containerRef.current.scrollHeight,
      });
    }
    measure();
    const obs = new ResizeObserver(measure);
    if (containerRef.current) {
      obs.observe(containerRef.current);
    }
    return () => obs.disconnect();
  }, [jobs, pipeline]);

  useLayoutEffect(() => {
    const obs = new MutationObserver(() => forceRender((n) => n + 1));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  const addJob = (job: Job) => {
    const next = [...jobs, job];
    onJobsChange(next);
    onActiveIndexChange(next.length - 1);
  };

  const copyJob = (index: number) => {
    const clone = structuredClone(jobs[index]);
    const next = [...jobs];
    next.splice(index + 1, 0, clone);
    onJobsChange(next);
    onActiveIndexChange(index + 1);
  };

  const deleteJob = (index: number) => {
    const next = jobs.filter((_, i) => i !== index);
    onJobsChange(next);
    if (next.length === 0) {
      onActiveIndexChange(-1);
    } else if (index === activeIndex) {
      onActiveIndexChange(0);
    } else if (index < activeIndex) {
      onActiveIndexChange(activeIndex - 1);
    }
  };

  const handlePipelineDrop = (fromKey: string, toKey: string) => {
    const parseKey = (key: string) => {
      const [c, r] = key.split("-").map(Number);
      return { column: c, row: r };
    };
    const from = parseKey(fromKey);
    const to = parseKey(toKey);
    const fromIndex = flatIndexFromPipeline(pipeline, jobs, from);
    const toIndex = flatIndexFromPipeline(pipeline, jobs, to);
    if (fromIndex < 0 || toIndex < 0) {
      return;
    }
    onJobsChange(moveJobInList(jobs, fromIndex, toIndex));
    onActiveIndexChange(adjustActiveIndexAfterMove(activeIndex, fromIndex, toIndex));
  };

  const lineColor = isDarkMode() ? LINE_COLOR_DARK : LINE_COLOR_LIGHT;

  return (
    <div className="pipeline d-flex flex-nowrap position-relative" ref={containerRef} id={pipelineId}>
      {pipeline.map((column, columnIndex) => (
        <div key={columnIndex} className="pipeline-column flex-grow-1">
          {column.map((job) => {
            const jobIndex = jobs.indexOf(job);
            const idx = pipelineJobIndex(pipeline, job);
            const key = idx ? `${idx.column}-${idx.row}` : String(jobIndex);
            const isActive = jobIndex === activeIndex;
            return (
              <div
                key={key}
                className={`pipeline-row${isActive ? " active" : ""}`}
                id={`${pipelineId}-job-${key}`}
                draggable={!readOnly}
                onDragStart={(e) => {
                  if (readOnly) {
                    return;
                  }
                  e.dataTransfer.setData("text/plain", key);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  if (readOnly) {
                    return;
                  }
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (readOnly) {
                    return;
                  }
                  e.preventDefault();
                  const fromKey = e.dataTransfer.getData("text/plain");
                  if (fromKey && fromKey !== key) {
                    handlePipelineDrop(fromKey, key);
                  }
                }}
              >
                {readOnly ? (
                  <div className={`nav btn-group flex-nowrap${isActive ? " active" : ""}`}>
                    <a
                      href="#"
                      className="select btn btn-outline-secondary text-nowrap justify-content-start d-flex align-items-center"
                      onClick={(e) => {
                        e.preventDefault();
                        onActiveIndexChange(jobIndex);
                      }}
                    >
                      <span className="label">{namedElementLabel(job.name)}</span>
                    </a>
                    {renderJobExtra?.(job, jobIndex)}
                  </div>
                ) : (
                  <ElementNavRow
                    layout="pipeline"
                    label={namedElementLabel(job.name)}
                    active={isActive}
                    onSelect={() => onActiveIndexChange(jobIndex)}
                    onCopy={() => copyJob(jobIndex)}
                    onDelete={() => deleteJob(jobIndex)}
                  />
                )}
              </div>
            );
          })}
          {!readOnly && columnIndex === 0 ? (
            <div className="pipeline-row add-job pipeline-action">
              <div className="add-job nav btn-group flex-nowrap">
                <a
                  href="#"
                  className="create btn btn-primary justify-content-start text-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    addJob({ name: "", steps: [] });
                  }}
                >
                  <Icon name="plus" className="icon flex-shrink-0 mr-1" /> Add New
                </a>
                {suggestedJobs.length > 0 ? (
                  <InlineDropdown
                    variant="btn-group"
                    className="suggestions btn btn-primary flex-grow-0 flex-shrink-0 btn-icon"
                    align="right"
                    label={<Icon name="wand" className="icon" />}
                  >
                    {({ close }) => (
                      <div className="list-group list-group-flush">
                        {suggestedJobs.map((job, i) => (
                          <a
                            key={i}
                            href="#"
                            className="list-group-item list-group-item-action"
                            onClick={(e) => {
                              e.preventDefault();
                              close();
                              addJob(structuredClone(job));
                            }}
                          >
                            {job.name || "Suggested job"}
                          </a>
                        ))}
                      </div>
                    )}
                  </InlineDropdown>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      ))}
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
        {Object.entries(dependencyMap).flatMap(([toKey, fromKeys]) =>
          fromKeys.map((fromKey) => {
            const active = activeKey === toKey || activeKey === fromKey;
            const path = computeEdgePath(fromKey, toKey, pipelineId, containerRef.current);
            if (!path) {
              return null;
            }
            return (
              <path
                key={`${fromKey}-${toKey}`}
                d={path}
                fill="none"
                stroke={active ? LINE_COLOR_ACTIVE : lineColor}
                strokeWidth={active ? LINE_WIDTH + 1 : LINE_WIDTH}
              />
            );
          }),
        )}
      </svg>
    </div>
  );
}

function computeEdgePath(
  fromKey: string,
  toKey: string,
  pipelineId: string,
  container: HTMLElement | null,
): string | null {
  if (!container) {
    return null;
  }
  const fromEl = document.getElementById(`${pipelineId}-job-${fromKey}`);
  const toEl = document.getElementById(`${pipelineId}-job-${toKey}`);
  if (!fromEl || !toEl) {
    return null;
  }
  const containerRect = container.getBoundingClientRect();
  const fromRect = fromEl.getBoundingClientRect();
  const toRect = toEl.getBoundingClientRect();
  const start: Point = {
    x: fromRect.right - containerRect.left,
    y: fromRect.top + fromRect.height / 2 - containerRect.top,
  };
  const end: Point = {
    x: toRect.left - containerRect.left,
    y: toRect.top + toRect.height / 2 - containerRect.top,
  };
  if (Math.abs(start.y - end.y) < 4) {
    return `M ${start.x},${start.y} L ${end.x},${end.y}`;
  }
  const corner = { x: end.x - 96, y: start.y };
  const curve = curvePath(corner, end);
  return `M ${start.x},${start.y} L ${corner.x},${corner.y} ${curve.replace(/^M[^C]+C\s*/, "C ")}`;
}
