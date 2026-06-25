import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../../layout/Layout";
import { Icon } from "../../components/onedev/Icon";
import {
  type AgentLogEntry,
  getAgentLogEntries,
} from "../../api/agents";

/**
 * Agent Log page — shows agent log entries with auto-refresh.
 * Reference: references/onedev/.../web/page/admin/buildsetting/agent/AgentLogPage.html
 */
export function AgentLogPage() {
  const { agent: agentIdParam } = useParams<{ agent: string }>();
  const agentId = Number(agentIdParam);

  const [entries, setEntries] = useState<AgentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!agentId || Number.isNaN(agentId)) {
      setError("Invalid agent ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await getAgentLogEntries(agentId);
      setEntries(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load agent log",
      );
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (autoRefresh && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries, autoRefresh]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      void load();
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  if (loading) {
    return (
      <Layout title="Agent Log">
        <div className="container m-2 m-sm-5">
          <div className="card">
            <div className="card-body text-center py-5 text-muted">
              Loading log entries...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Agent Log">
        <div className="container m-2 m-sm-5">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-light-danger" role="alert">
                {error}
              </div>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void load()}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Agent Log">
      <div className="container m-2 m-sm-5">
        {/* Agent subtabs */}
        <ul className="nav nav-tabs nav-tabs-line nav-bold mb-5">
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agentId}`}
              className="nav-link"
            >
              Overview
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agentId}/builds`}
              className="nav-link"
            >
              Builds
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agentId}/workspaces`}
              className="nav-link"
            >
              Workspaces
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agentId}/log`}
              className="nav-link active"
            >
              Log
            </Link>
          </li>
        </ul>

        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Agent Log</h6>
            <div className="d-flex align-items-center gap-3">
              <label className="d-flex align-items-center mb-0 font-size-sm">
                <input
                  type="checkbox"
                  className="mr-1"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                Auto-refresh
              </label>
              <button
                type="button"
                className="btn btn-light btn-sm"
                onClick={() => void load()}
              >
                <Icon name="refresh" className="mr-1" />
                Refresh
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            {entries.length === 0 ? (
              <div className="text-center py-5 text-muted">
                No log entries available.
              </div>
            ) : (
              <div
                className="log-content p-3"
                style={{
                  fontFamily:
                    "'Consolas', 'Monaco', 'Courier New', monospace",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  maxHeight: "600px",
                  overflowY: "auto",
                  backgroundColor: "var(--dark-mode-bg, #1e1e1e)",
                  color: "var(--dark-mode-text, #d4d4d4)",
                }}
              >
                {entries.map((entry, idx) => (
                  <div key={idx} className="log-line d-flex">
                    <span
                      className="log-timestamp mr-3"
                      style={{
                        color: "var(--dark-mode-muted, #6c757d)",
                        whiteSpace: "nowrap",
                        minWidth: 180,
                      }}
                    >
                      {new Date(entry.date).toLocaleString()}
                    </span>
                    <span className="log-message">{entry.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
