import { useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import {
  IterationHeader,
  IterationTabNav,
} from "../../../components/onedev/panels/IterationDetailPanel";
import {
  fetchIteration,
  fetchIterationBurndown,
} from "../../../api/iterations";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev IterationBurndownPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationBurndownPage.html
 */
export function IterationBurndownPage() {
  const { projectPath } = useProject();
  const { iteration: iterationParam } = useParams<{ iteration: string }>();
  const id = parseInt(iterationParam ?? "0", 10);

  const { data: iteration, loading: iterLoading, error: iterError } = useAsyncResource(
    () => fetchIteration(id),
    [id],
  );

  const { data: burndown, loading: statsLoading, error: statsError } = useAsyncResource(
    () => fetchIterationBurndown(id),
    [id],
  );

  const progress =
    burndown && burndown.total > 0
      ? Math.round((burndown.closed / burndown.total) * 100)
      : 0;

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={iteration ? `${iteration.name} - Burndown` : "Iteration Burndown"}
    >
      <div className="card m-3">
        <div className="card-body">
          {iterLoading && <div className="text-muted mb-3">Loading iteration...</div>}
          {iterError && (
            <div className="alert alert-danger" role="alert">
              {iterError}
            </div>
          )}
          {iteration && <IterationHeader iteration={iteration} />}

          <IterationTabNav activeTab="burndown" projectPath={projectPath} iterationId={id} />

          {statsError && (
            <div className="alert alert-danger" role="alert">
              {statsError}
            </div>
          )}

          <div className="card">
            <div className="card-body">
              {statsLoading && (
                <div className="text-muted text-center py-4">Loading burndown...</div>
              )}
              {burndown && !statsLoading && (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="font-weight-bold">Progress</span>
                    <span className="text-muted">
                      {burndown.closed} / {burndown.total} closed ({progress}%)
                    </span>
                  </div>
                  <div className="progress mb-4" style={{ height: "1.5rem" }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${progress}%` }}
                      aria-valuenow={progress}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <div className="row text-center">
                    <div className="col-md-4 mb-3">
                      <div className="text-muted font-size-sm">Total</div>
                      <div className="h4 mb-0">{burndown.total}</div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="text-muted font-size-sm">Open</div>
                      <div className="h4 mb-0 text-warning">{burndown.open}</div>
                    </div>
                    <div className="col-md-4 mb-3">
                      <div className="text-muted font-size-sm">Closed</div>
                      <div className="h4 mb-0 text-success">{burndown.closed}</div>
                    </div>
                  </div>
                  {Object.keys(burndown.byState).length > 0 && (
                    <table className="table table-sm mt-3 mb-0">
                      <thead>
                        <tr>
                          <th>State</th>
                          <th className="text-right">Issues</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(burndown.byState).map(([state, count]) => (
                          <tr key={state}>
                            <td>{state}</td>
                            <td className="text-right">{count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              {burndown && burndown.total === 0 && !statsLoading && (
                <div className="text-center py-5 text-muted">
                  <Icon name="chart" width={48} height={48} />
                  <h5 className="mt-3">No scheduled issues</h5>
                  <p className="font-size-sm">
                    Schedule issues into this iteration to track burndown progress.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
