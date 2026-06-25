import { useCallback, useEffect, useState } from "react";
import { Layout } from "../../layout/Layout";
import { Icon } from "../../components/onedev/Icon";
import {
  type JobExecutor,
  queryJobExecutors,
  toggleJobExecutor,
} from "../../api/agents";

/**
 * Job Executors page — lists configured executors with enable/disable toggle.
 * Reference: references/onedev/.../web/page/admin/buildsetting/jobexecutor/JobExecutorsPage.html
 */
export function JobExecutorsPage() {
  const [executors, setExecutors] = useState<JobExecutor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await queryJobExecutors();
      setExecutors(result);
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to load job executors",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (executor: JobExecutor) => {
    try {
      await toggleJobExecutor(executor.id, !executor.enabled);
      setActionMsg(
        `Executor "${executor.name}" ${
          executor.enabled ? "disabled" : "enabled"
        }`,
      );
      void load();
    } catch {
      setActionMsg(`Failed to toggle executor "${executor.name}"`);
    }
  };

  return (
    <Layout title="Job Executors">
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
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Job Executors</h5>
          </div>
          <div className="card-body">
            {error && (
              <div className="alert alert-light-danger mb-3" role="alert">
                {error}
              </div>
            )}
            {loading ? (
              <div className="text-center py-5 text-muted">
                Loading executors...
              </div>
            ) : executors.length === 0 ? (
              <div className="text-center py-5 text-muted">
                No job executors configured.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                      <th>Status</th>
                      <th>Job Match</th>
                      <th>Note</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {executors.map((exec) => (
                      <tr key={exec.id}>
                        <td className="font-weight-bold">{exec.name}</td>
                        <td>
                          <span className="badge badge-info">
                            {exec.type}
                          </span>
                        </td>
                        <td>
                          {exec.enabled ? (
                            <span className="badge badge-success">
                              Enabled
                            </span>
                          ) : (
                            <span className="badge badge-secondary">
                              Disabled
                            </span>
                          )}
                        </td>
                        <td>
                          <code>{exec.jobMatch ?? "*"}</code>
                        </td>
                        <td className="text-muted font-size-sm">
                          {exec.note ?? "—"}
                        </td>
                        <td>
                          <label className="bean-switch mb-0">
                            <input
                              type="checkbox"
                              checked={exec.enabled}
                              onChange={() => handleToggle(exec)}
                            />
                            <span className="bean-switch-slider round" />
                          </label>
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
