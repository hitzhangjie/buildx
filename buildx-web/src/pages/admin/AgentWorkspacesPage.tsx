import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../../layout/Layout";
import { WorkspaceStatusIcon } from "../../components/onedev/WorkspaceStatusIcon";
import {
  fetchWorkspaces,
  type Workspace,
  workspaceStatusBadgeClass,
} from "../../api/workspaces";

/**
 * Agent Workspaces page — lists workspaces running on this agent.
 * Reference: references/onedev/.../web/page/admin/buildsetting/agent/AgentWorkspacesPage.html
 */
export function AgentWorkspacesPage() {
  const { agent: agentIdParam } = useParams<{ agent: string }>();
  const agentId = Number(agentIdParam);

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!agentId || Number.isNaN(agentId)) {
      setError("Invalid agent ID");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchWorkspaces({
        query: `"Agent" is "${agentId}"`,
        count: 50,
      });
      setWorkspaces(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load workspaces",
      );
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout title="Agent Workspaces">
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
              className="nav-link active"
            >
              Workspaces
            </Link>
          </li>
          <li className="nav-item">
            <Link
              to={`/~administration/agents/${agentId}/log`}
              className="nav-link"
            >
              Log
            </Link>
          </li>
        </ul>

        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Workspaces</h6>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-light-danger mb-3">{error}</div>
            )}
            {loading ? (
              <div className="text-center py-5 text-muted">
                Loading workspaces...
              </div>
            ) : workspaces.length === 0 ? (
              <div className="text-center py-5 text-muted">
                No workspaces are running on this agent.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Project</th>
                      <th>Spec</th>
                      <th>Status</th>
                      <th>Branch</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaces.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <Link
                            to={`/${w.project?.path ?? "unknown"}/~workspaces/${w.number}`}
                            className="font-weight-bold"
                          >
                            #{w.number}
                          </Link>
                        </td>
                        <td>
                          {w.project ? (
                            <Link to={`/${w.project.path}`}>
                              {w.project.path}
                            </Link>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td>{w.specName}</td>
                        <td>
                          <span className={workspaceStatusBadgeClass(w.status)}>
                            <WorkspaceStatusIcon status={w.status} />
                            <span className="ml-1">{w.status}</span>
                          </span>
                        </td>
                        <td className="text-muted font-size-sm">
                          {w.branch ?? "—"}
                        </td>
                        <td className="text-muted font-size-sm">
                          {w.createDate
                            ? new Date(w.createDate).toLocaleString()
                            : "—"}
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
    </Layout>
  );
}
