import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "../../layout/Layout";
import { BuildStatusIcon } from "../../components/onedev/build/BuildStatusIcon";
import { type Build, queryBuilds } from "../../api/builds";

/**
 * Agent Builds page — lists builds that ran on this agent.
 * Reference: references/onedev/.../web/page/admin/buildsetting/agent/AgentBuildsPage.html
 */
export function AgentBuildsPage() {
  const { agent: agentIdParam } = useParams<{ agent: string }>();
  const agentId = Number(agentIdParam);

  const [builds, setBuilds] = useState<Build[]>([]);
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
      const result = await queryBuilds({
        query: `"Agent" is "${agentId}"`,
        count: 50,
      });
      setBuilds(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load builds",
      );
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout title="Agent Builds">
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
              className="nav-link active"
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
              className="nav-link"
            >
              Log
            </Link>
          </li>
        </ul>

        <div className="card">
          <div className="card-header">
            <h6 className="mb-0">Builds</h6>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-light-danger mb-3">{error}</div>
            )}
            {loading ? (
              <div className="text-center py-5 text-muted">
                Loading builds...
              </div>
            ) : builds.length === 0 ? (
              <div className="text-center py-5 text-muted">
                No builds have run on this agent yet.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Build</th>
                      <th>Job</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {builds.map((b) => (
                      <tr key={b.id}>
                        <td>
                          <Link
                            to={`/${b.project?.path ?? "unknown"}/~builds/${b.number}`}
                            className="font-weight-bold"
                          >
                            #{b.number}
                          </Link>
                        </td>
                        <td>{b.jobName}</td>
                        <td>
                          <BuildStatusIcon status={b.status} />
                        </td>
                        <td className="text-muted font-size-sm">
                          {b.submitDate
                            ? new Date(b.submitDate).toLocaleString()
                            : "—"}
                        </td>
                        <td className="text-muted font-size-sm">
                          {b.runningDuration !== undefined
                            ? formatDuration(b.runningDuration)
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

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
