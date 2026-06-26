import { useCallback, useEffect, useRef, useState } from "react";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import { Icon } from "../../../components/onedev/Icon";
import {
  getBuildLog,
  streamBuildLog,
  type LogEntry,
  cancelBuild,
} from "../../../api/builds";
import "./build-detail.css";

/**
 * BuildLogPage — live streaming build log with color-coded output.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/log/BuildLogPage.html
 */
export function BuildLogPage() {
  const { projectPath, build, loading, error } = useBuildDetail();
  const [logEntries, setLogEntries] = useState<LogEntry[]>([]);
  const [logLoading, setLogLoading] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const [collapsedSteps, setCollapsedSteps] = useState<Set<string>>(
    new Set(),
  );
  const logContainerRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch existing log entries; poll while the build is running.
  useEffect(() => {
    if (!build) return;

    let cancelled = false;
    setLogLoading(true);
    setLogError(null);

    const fetchLog = () => {
      void getBuildLog(build.id)
        .then((entries) => {
          if (cancelled) return;
          setLogEntries(entries);
          setLogError(null);
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          setLogError(
            err instanceof Error ? err.message : "Failed to load log",
          );
        })
        .finally(() => {
          if (!cancelled) {
            setLogLoading(false);
          }
        });
    };

    fetchLog();

    const isFinished = ["SUCCESSFUL", "FAILED", "CANCELLED", "TIMED_OUT"].includes(
      build.status,
    );
    if (isFinished) {
      return () => {
        cancelled = true;
      };
    }

    const interval = window.setInterval(fetchLog, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [build?.id, build?.status]);

  // Connect to SSE stream for live updates; reconnect while the build is running.
  useEffect(() => {
    if (!build) return;
    const isFinished = ["SUCCESSFUL", "FAILED", "CANCELLED", "TIMED_OUT"].includes(
      build.status,
    );
    if (isFinished) return;

    let cancelled = false;
    let source: EventSource | null = null;
    let retryTimer: number | undefined;

    const connect = () => {
      if (cancelled) return;
      source?.close();
      try {
        source = streamBuildLog(build.id);
      } catch {
        retryTimer = window.setTimeout(connect, 2000);
        return;
      }

      source.onmessage = (event) => {
        try {
          const entry = JSON.parse(event.data) as LogEntry;
          setLogEntries((prev) => {
            if (prev.some((e) => e.id === entry.id)) {
              return prev;
            }
            return [...prev, entry];
          });
        } catch {
          // ignore malformed entries
        }
      };

      source.onerror = () => {
        source?.close();
        source = null;
        if (!cancelled) {
          retryTimer = window.setTimeout(connect, 2000);
        }
      };

      eventSourceRef.current = source;
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) {
        window.clearTimeout(retryTimer);
      }
      source?.close();
      eventSourceRef.current = null;
    };
  }, [build?.id, build?.status]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop =
        logContainerRef.current.scrollHeight;
    }
  }, [logEntries, autoScroll]);

  const handleDownload = useCallback(() => {
    if (!build) return;
    const text = logEntries
      .map((e) => `[${e.timestamp}] [${e.stepName ?? ""}] ${e.message}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `build-${build.number}-log.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [build, logEntries]);

  const handleCancel = useCallback(async () => {
    if (!build) return;
    try {
      await cancelBuild(build.id);
    } catch {
      // ignore
    }
  }, [build]);

  const toggleStepCollapse = (stepName: string) => {
    setCollapsedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(stepName)) {
        next.delete(stepName);
      } else {
        next.add(stepName);
      }
      return next;
    });
  };

  const isRunning =
    build &&
    ["WAITING", "PENDING", "RUNNING"].includes(build.status);

  // Group log entries by step
  const groupedByStep = logEntries.reduce<
    Record<string, { entries: LogEntry[]; level: string }>
  >((acc, entry) => {
    const step = entry.stepName ?? "(no step)";
    if (!acc[step]) {
      acc[step] = { entries: [], level: "info" };
    }
    acc[step].entries.push(entry);
    if (entry.level === "error") acc[step].level = "error";
    if (entry.level === "warn" && acc[step].level !== "error")
      acc[step].level = "warn";
    return acc;
  }, {});

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="log"
    >
      <div className="build-log d-flex flex-column flex-grow-1 position-relative">
        {/* Action buttons bar */}
        {build && (
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-3">
              <label className="d-flex align-items-center mb-0 font-size-sm">
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                />
                Auto-scroll
              </label>
              {isRunning && (
                <button
                  type="button"
                  className="btn btn-light btn-hover-danger btn-sm"
                  title="Cancel build"
                  onClick={handleCancel}
                >
                  <Icon name="cancel" className="mr-1" />
                  Cancel
                </button>
              )}
            </div>
            <button
              type="button"
              className="btn btn-light btn-hover-primary btn-icon btn-sm"
              title="Download log"
              onClick={handleDownload}
            >
              <Icon name="download" />
            </button>
          </div>
        )}

        {/* Log content area */}
        <div
          ref={logContainerRef}
          className="log-content flex-grow-1"
          style={{
            backgroundColor: "var(--dark-mode-bg, #1e1e1e)",
            color: "var(--dark-mode-text, #d4d4d4)",
            fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
            fontSize: "13px",
            lineHeight: "1.5",
            padding: "16px",
            borderRadius: "4px",
            overflowX: "auto",
            overflowY: "auto",
            minHeight: "400px",
            maxHeight: "calc(100vh - 320px)",
          }}
          onScroll={() => {
            if (!logContainerRef.current) return;
            const el = logContainerRef.current;
            const isAtBottom =
              el.scrollHeight - el.scrollTop - el.clientHeight < 50;
            if (!isAtBottom && autoScroll) {
              setAutoScroll(false);
            }
          }}
        >
          {logLoading && logEntries.length === 0 && (
            <div className="text-muted">Loading log entries...</div>
          )}
          {logError && (
            <div className="text-danger mb-2">
              <Icon name="warning" className="mr-1" />
              {logError}
            </div>
          )}
          {!logLoading && !logError && logEntries.length === 0 && (
            <div className="text-muted" style={{ opacity: 0.6 }}>
              {build ? (
                <div>No log entries available for this build.</div>
              ) : null}
            </div>
          )}
          {Object.entries(groupedByStep).map(
            ([stepName, { entries, level }]) => {
              const isCollapsed = collapsedSteps.has(stepName);
              const levelColor =
                level === "error"
                  ? "#f44336"
                  : level === "warn"
                    ? "#ff9800"
                    : "var(--dark-mode-text, #d4d4d4)";

              return (
                <div key={stepName} className="log-step mb-2">
                  <div
                    className="log-step-header d-flex align-items-center"
                    style={{
                      cursor: "pointer",
                      padding: "4px 8px",
                      backgroundColor: "rgba(255,255,255,0.03)",
                      borderRadius: "3px",
                      userSelect: "none",
                    }}
                    onClick={() => toggleStepCollapse(stepName)}
                  >
                    <Icon
                      name={isCollapsed ? "caret-right" : "caret-down"}
                      width={12}
                      height={12}
                      className="mr-2"
                    />
                    <span
                      className="font-weight-bold"
                      style={{
                        color: levelColor,
                        fontSize: "12px",
                        textTransform: "uppercase",
                      }}
                    >
                      {stepName === "(no step)" ? "" : stepName}
                    </span>
                    <span className="ml-2 text-muted" style={{ fontSize: "11px" }}>
                      ({entries.length} lines)
                    </span>
                  </div>
                  {!isCollapsed && (
                    <div className="log-step-entries">
                      {entries.map((entry, idx) => (
                        <div
                          key={`${entry.id}-${idx}`}
                          className="log-line d-flex"
                          style={{
                            padding: "1px 8px 1px 24px",
                            backgroundColor:
                              isStderrLevel(entry.level)
                                ? "rgba(244,67,54,0.05)"
                                : "transparent",
                          }}
                        >
                          <span
                            className="log-timestamp mr-3"
                            style={{
                              color: "var(--dark-mode-muted, #6c757d)",
                              whiteSpace: "nowrap",
                              minWidth: 80,
                              fontSize: "11px",
                            }}
                          >
                            {entry.timestamp
                              ? formatLogTimestamp(entry.timestamp)
                              : ""}
                          </span>
                          <span
                            className="log-message"
                            style={{
                              color:
                                isStderrLevel(entry.level)
                                  ? "#f44336"
                                  : entry.level === "stdout"
                                    ? "var(--dark-mode-text, #d4d4d4)"
                                    : entry.level === "warn"
                                      ? "#ff9800"
                                      : entry.level === "info"
                                        ? "var(--dark-mode-text, #d4d4d4)"
                                        : "inherit",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                            }}
                          >
                            {entry.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            },
          )}
          {isRunning && (
            <div className="text-muted mt-2" style={{ opacity: 0.5 }}>
              <Icon name="spin" className="mr-1" />
              Waiting for log output...
            </div>
          )}
        </div>

        {/* Status info */}
        <div className="font-size-sm text-muted mt-3 d-flex align-items-center">
          <Icon name="bulb" />
          <span className="ml-2">
            {isRunning
              ? "Log entries appear in real-time while the build is running."
              : logEntries.length > 0
                ? `${logEntries.length} log entries. Build completed.`
                : "No log entries."}
          </span>
        </div>
      </div>
    </BuildDetailLayout>
  );
}

function formatLogTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleTimeString();
  } catch {
    return ts;
  }
}

function isStderrLevel(level: string): boolean {
  return level === "stderr" || level === "error";
}
