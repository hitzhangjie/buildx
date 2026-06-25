import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../../layout/Layout";
import { Icon } from "../../components/onedev/Icon";
import {
  type Agent,
  getAgent,
  getAgentAttributes,
  updateAgentAttributes,
} from "../../api/agents";

/**
 * Agent Overview page — shows agent details, system info, and attributes.
 * Reference: references/onedev/.../web/page/admin/buildsetting/agent/AgentOverviewPage.html
 */
export function AgentOverviewPage() {
  const { agent: agentIdParam } = useParams<{ agent: string }>();
  const agentId = Number(agentIdParam);

  const [agent, setAgent] = useState<Agent | null>(null);
  const [attributes, setAttributes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingAttrs, setEditingAttrs] = useState(false);
  const [editAttrs, setEditAttrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agentId || Number.isNaN(agentId)) {
      setError("Invalid agent ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [a, attrs] = await Promise.all([
        getAgent(agentId),
        getAgentAttributes(agentId),
      ]);
      setAgent(a);
      setAttributes(attrs);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load agent details",
      );
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSaveAttributes = async () => {
    if (!agent) return;
    setSaving(true);
    try {
      await updateAgentAttributes(agent.id, editAttrs);
      setAttributes(editAttrs);
      setEditingAttrs(false);
      setActionMsg("Attributes updated");
    } catch {
      setActionMsg("Failed to update attributes");
    } finally {
      setSaving(false);
    }
  };

  const startEditAttrs = () => {
    setEditAttrs({ ...attributes });
    setEditingAttrs(true);
  };

  if (loading) {
    return (
      <Layout title="Agent">
        <div className="container m-2 m-sm-5">
          <div className="card">
            <div className="card-body text-center py-5 text-muted">
              Loading agent details...
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !agent) {
    return (
      <Layout title="Agent">
        <div className="container m-2 m-sm-5">
          <div className="card">
            <div className="card-body">
              <div className="alert alert-light-danger" role="alert">
                {error ?? "Agent not found"}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const memUsage =
    agent.memTotal && agent.memFree !== undefined
      ? Math.round(((agent.memTotal - agent.memFree) / agent.memTotal) * 100)
      : null;
  const diskUsage =
    agent.diskTotal && agent.diskFree !== undefined
      ? Math.round(((agent.diskTotal - agent.diskFree) / agent.diskTotal) * 100)
      : null;
  const uptime =
    agent.lastActiveDate
      ? Math.round(
          (Date.now() - new Date(agent.lastActiveDate).getTime()) / 1000,
        )
      : null;

  return (
    <Layout title={`Agent: ${agent.name}`}>
      <div className="container m-2 m-sm-5">
        {actionMsg && (
          <div className="alert alert-primary alert-dismissible fade show" role="alert">
            {actionMsg}
            <button
              type="button"
              className="close"
              onClick={() => setActionMsg(null)}
              aria-label="Close"
            >
              <Icon name="times" />
            </button>
          </div>
        )}

        {/* Agent tabs */}
        <ul className="nav nav-tabs nav-tabs-line nav-bold mb-5">
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agent.id}`}
              className="nav-link active"
            >
              Overview
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agent.id}/builds`}
              className="nav-link"
            >
              Builds
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agent.id}/workspaces`}
              className="nav-link"
            >
              Workspaces
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agent.id}/log`}
              className="nav-link"
            >
              Log
            </Link>
          </li>
        </ul>

        {/* General info */}
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">General</h6>
          </div>
          <div className="card-body">
            <table className="table table-sm mb-0">
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: 180 }}>
                    Name
                  </td>
                  <td className="font-weight-bold">{agent.name}</td>
                </tr>
                <tr>
                  <td className="text-muted">Status</td>
                  <td>
                    <AgentStatusBadge
                      online={agent.online}
                      paused={agent.paused}
                    />
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">IP Address</td>
                  <td>
                    <code>{agent.ipAddress}</code>
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Agent Version</td>
                  <td>{agent.agentVersion ?? "—"}</td>
                </tr>
                {uptime !== null && (
                  <tr>
                    <td className="text-muted">Uptime</td>
                    <td>{formatDuration(uptime)}</td>
                  </tr>
                )}
                {agent.lastActiveDate && (
                  <tr>
                    <td className="text-muted">Last Active</td>
                    <td>{new Date(agent.lastActiveDate).toLocaleString()}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* OS info */}
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">Operating System</h6>
          </div>
          <div className="card-body">
            <table className="table table-sm mb-0">
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: 180 }}>
                    OS
                  </td>
                  <td>{agent.os}</td>
                </tr>
                <tr>
                  <td className="text-muted">Version</td>
                  <td>{agent.osVersion ?? "—"}</td>
                </tr>
                <tr>
                  <td className="text-muted">Architecture</td>
                  <td>{agent.arch}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Resource usage */}
        <div className="card mb-4">
          <div className="card-header">
            <h6 className="mb-0">Resources</h6>
          </div>
          <div className="card-body">
            <table className="table table-sm mb-0">
              <tbody>
                <tr>
                  <td className="text-muted" style={{ width: 180 }}>
                    CPU
                  </td>
                  <td>
                    {agent.cpuCount} cores
                    {agent.cpuLoad !== undefined && (
                      <span className="ml-2 text-muted">
                        (load: {Math.round(agent.cpuLoad * 100)}%)
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Memory</td>
                  <td>
                    {agent.memTotal !== undefined
                      ? formatBytes(agent.memTotal)
                      : "—"}
                    {memUsage !== null && (
                      <span className="ml-2 text-muted">
                        ({memUsage}% used —
                        {agent.memFree !== undefined
                          ? ` ${formatBytes(agent.memFree)} free`
                          : ""})
                      </span>
                    )}
                  </td>
                </tr>
                <tr>
                  <td className="text-muted">Disk</td>
                  <td>
                    {agent.diskTotal !== undefined
                      ? formatBytes(agent.diskTotal)
                      : "—"}
                    {diskUsage !== null && (
                      <span className="ml-2 text-muted">
                        ({diskUsage}% used —
                        {agent.diskFree !== undefined
                          ? ` ${formatBytes(agent.diskFree)} free`
                          : ""})
                      </span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Attributes */}
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h6 className="mb-0">Attributes</h6>
            <button
              type="button"
              className="btn btn-light btn-sm"
              onClick={startEditAttrs}
              disabled={editingAttrs}
            >
              <Icon name="edit" className="mr-1" />
              Edit
            </button>
          </div>
          <div className="card-body">
            {editingAttrs ? (
              <div>
                <table className="table table-sm mb-3">
                  <thead>
                    <tr>
                      <th style={{ width: 200 }}>Key</th>
                      <th>Value</th>
                      <th style={{ width: 40 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(editAttrs).map(([k, v], i) => (
                      <tr key={i}>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={k}
                            onChange={(e) => {
                              const next = { ...editAttrs };
                              delete next[k];
                              next[e.target.value] = v;
                              setEditAttrs(next);
                            }}
                          />
                        </td>
                        <td>
                          <input
                            className="form-control form-control-sm"
                            value={v}
                            onChange={(e) =>
                              setEditAttrs({ ...editAttrs, [k]: e.target.value })
                            }
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-sm btn-light-danger"
                            onClick={() => {
                              const next = { ...editAttrs };
                              delete next[k];
                              setEditAttrs(next);
                            }}
                          >
                            <Icon name="trash" width={14} height={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="mb-3">
                  <button
                    type="button"
                    className="btn btn-light btn-sm"
                    onClick={() =>
                      setEditAttrs({
                        ...editAttrs,
                        ["new-key"]: "new-value",
                      })
                    }
                  >
                    <Icon name="plus" className="mr-1" />
                    Add Attribute
                  </button>
                </div>
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    onClick={handleSaveAttributes}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setEditingAttrs(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : Object.keys(attributes).length === 0 ? (
              <div className="text-muted py-3 text-center">
                No attributes defined for this agent.
              </div>
            ) : (
              <table className="table table-sm mb-0">
                <thead>
                  <tr>
                    <th style={{ width: 200 }}>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(attributes).map(([k, v]) => (
                    <tr key={k}>
                      <td className="text-muted">{k}</td>
                      <td>
                        <code>{v}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

function AgentStatusBadge({
  online,
  paused,
}: {
  online: boolean;
  paused: boolean;
}) {
  let label: string;
  let badgeClass: string;
  if (paused) {
    label = "Paused";
    badgeClass = "badge badge-warning";
  } else if (online) {
    label = "Online";
    badgeClass = "badge badge-success";
  } else {
    label = "Offline";
    badgeClass = "badge badge-secondary";
  }
  return (
    <span className={badgeClass}>
      <Icon
        name={online && !paused ? "check" : "cross"}
        className="icon mr-1"
        width={12}
        height={12}
      />
      {label}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

function formatDuration(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}
