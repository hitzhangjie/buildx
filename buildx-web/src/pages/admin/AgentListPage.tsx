import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";
import { ConfirmModal } from "../../components/onedev/ConfirmModal";
import {
  type Agent,
  queryAgents,
  pauseAgent,
  resumeAgent,
  deleteAgent,
} from "../../api/agents";

/**
 * Mirrors OneDev AgentListPage.html.
 * Reference: references/onedev/.../web/page/admin/buildsetting/agent/AgentListPage.html
 */
export function AgentListPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [deleteTarget, setDeleteTarget] = useState<Agent | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const loadAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryAgents(searchQuery || undefined);
      setAgents(result);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    void loadAgents();
  }, [loadAgents]);

  const handlePause = async (agent: Agent) => {
    try {
      await pauseAgent(agent.id);
      setActionMsg(`Agent "${agent.name}" paused`);
      void loadAgents();
    } catch {
      setActionMsg(`Failed to pause agent "${agent.name}"`);
    }
  };

  const handleResume = async (agent: Agent) => {
    try {
      await resumeAgent(agent.id);
      setActionMsg(`Agent "${agent.name}" resumed`);
      void loadAgents();
    } catch {
      setActionMsg(`Failed to resume agent "${agent.name}"`);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAgent(deleteTarget.id);
      setActionMsg(`Agent "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      void loadAgents();
    } catch {
      setActionMsg(`Failed to delete agent "${deleteTarget.name}"`);
      setDeleteTarget(null);
    }
  };

  const filteredAgents = agents.filter((a) => {
    if (statusFilter === "online") return a.online && !a.paused;
    if (statusFilter === "offline") return !a.online;
    if (statusFilter === "paused") return a.paused;
    return true;
  });

  return (
    <Layout title="Agents">
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

        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Agents</h5>
          </div>
          <div className="card-body">
            {/* Search and filter bar */}
            <div className="d-flex flex-wrap align-items-center mb-3 gap-3">
              <div className="input-group" style={{ maxWidth: 320 }}>
                <input
                  type="text"
                  className="form-control form-control-sm"
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <div className="input-group-append">
                  <span className="input-group-text">
                    <Icon name="search" width={14} height={14} />
                  </span>
                </div>
              </div>
              <div className="btn-group btn-group-sm" role="group">
                {["", "online", "offline", "paused"].map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={`btn ${
                      statusFilter === filter ? "btn-primary" : "btn-light"
                    }`}
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter === ""
                      ? "All"
                      : filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="alert alert-light-danger mb-3" role="alert">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-5 text-muted">Loading agents...</div>
            ) : filteredAgents.length === 0 ? (
              <div className="text-center py-5 text-muted">
                {searchQuery || statusFilter
                  ? "No agents match the current filter."
                  : "No agents registered yet."}
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Status</th>
                      <th>OS</th>
                      <th>Arch</th>
                      <th>IP Address</th>
                      <th>CPU</th>
                      <th>Last Active</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAgents.map((agent) => (
                      <tr key={agent.id}>
                        <td>
                          <Link
                            to={`/~administration/agents/${agent.id}`}
                            className="font-weight-bold"
                          >
                            {agent.name}
                          </Link>
                        </td>
                        <td>
                          <AgentStatusBadge
                            online={agent.online}
                            paused={agent.paused}
                          />
                        </td>
                        <td>
                          {agent.os} {agent.osVersion}
                        </td>
                        <td>{agent.arch}</td>
                        <td>
                          <code>{agent.ipAddress}</code>
                        </td>
                        <td>{agent.cpuCount} cores</td>
                        <td className="text-muted font-size-sm">
                          {agent.lastActiveDate
                            ? formatRelativeTime(agent.lastActiveDate)
                            : "—"}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            {agent.paused ? (
                              <button
                                type="button"
                                className="btn btn-light btn-hover-primary"
                                title="Resume"
                                onClick={() => handleResume(agent)}
                              >
                                <Icon name="play" width={14} height={14} />
                              </button>
                            ) : (
                              <button
                                type="button"
                                className="btn btn-light btn-hover-warning"
                                title="Pause"
                                onClick={() => handlePause(agent)}
                                disabled={!agent.online}
                              >
                                <Icon name="pause" width={14} height={14} />
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn btn-light btn-hover-danger"
                              title="Delete"
                              onClick={() => setDeleteTarget(agent)}
                            >
                              <Icon name="trash" width={14} height={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <ConfirmModal
          message={`Are you sure you want to delete agent <strong>${deleteTarget.name}</strong>?`}
          confirmInput={deleteTarget.name}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
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

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}
