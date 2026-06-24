import { Link, useParams } from "react-router-dom";
import {
  IterationHeader,
  IterationTabNav,
} from "../../../components/onedev/panels/IterationDetailPanel";
import {
  fetchIteration,
  fetchIterationIssues,
} from "../../../api/iterations";
import { stateBadgeColor } from "../../../api/issues";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev IterationIssuesPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationIssuesPage.html
 */
export function IterationIssuesPage() {
  const { projectPath } = useProject();
  const { iteration: iterationParam } = useParams<{ iteration: string }>();
  const id = parseInt(iterationParam ?? "0", 10);

  const { data: iteration, loading: iterLoading, error: iterError } = useAsyncResource(
    () => fetchIteration(id),
    [id],
  );

  const { data: issues, loading: issuesLoading, error: issuesError } = useAsyncResource(
    () => fetchIterationIssues(id),
    [id],
  );

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={iteration ? `${iteration.name} - Issues` : "Iteration Issues"}
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

          <IterationTabNav activeTab="issues" projectPath={projectPath} iterationId={id} />

          {issuesError && (
            <div className="alert alert-danger" role="alert">
              {issuesError}
            </div>
          )}
          {issuesLoading && <div className="text-muted mb-3">Loading issues...</div>}

          <table className="table">
            <thead>
              <tr>
                <th>Issue</th>
                <th>State</th>
                <th>Submitter</th>
              </tr>
            </thead>
            <tbody>
              {(issues ?? []).map((issue) => (
                <tr key={issue.id}>
                  <td>
                    <Link
                      to={`/${projectPath}/~issues/${issue.number}`}
                      className="font-weight-bold"
                    >
                      #{issue.number} {issue.title}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge badge-${stateBadgeColor(issue.state)} font-size-sm`}>
                      {issue.state}
                    </span>
                  </td>
                  <td className="text-muted">{issue.submitter?.name ?? "—"}</td>
                </tr>
              ))}
              {!issuesLoading && (issues ?? []).length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">
                    No issues in this iteration
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
