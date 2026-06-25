import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import {
  fetchIssuePullRequests,
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type PullRequest,
} from "../../../api/pullRequests";
import { IssueDetailShell } from "./IssueDetailShell";

/**
 * Pull requests tab for issue detail.
 * Mirrors OneDev IssuePullRequestsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssuePullRequestsPage.html
 */
export function IssuePullRequestsPage() {
  const { projectPath } = useProject();
  const { issue: issueParam } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issueParam ?? "0", 10);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!issueNumber) return;
    let cancelled = false;
    setLoading(true);
    void fetchIssuePullRequests(projectPath, issueNumber)
      .then((prList) => {
        if (cancelled) return;
        setPulls(prList);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [projectPath, issueNumber]);

  return (
    <IssueDetailShell activeTab="pulls">
      {loading ? (
        <div className="text-center text-muted py-5">Loading...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Pull Request</th>
              <th>Status</th>
              <th>Branches</th>
              <th>Author</th>
            </tr>
          </thead>
          <tbody>
            {pulls.map((pr) => (
              <tr key={pr.id}>
                <td>
                  <Link
                    to={`/${projectPath}/~pulls/${pr.number}`}
                    className="font-weight-bold"
                  >
                    {pr.title}
                  </Link>
                  <span className="text-muted ml-1">#{pr.number}</span>
                </td>
                <td>
                  <span className={`badge badge-sm font-size-xs ${pullRequestStatusBadge(pr.status)}`}>
                    {pullRequestStatusLabel(pr.status)}
                  </span>
                </td>
                <td className="text-muted font-size-sm">
                  <Icon name="branch" />
                  <span className="mx-1">{pr.sourceBranch}</span>
                  <span className="mx-1">&rarr;</span>
                  <span className="mx-1">{pr.targetBranch}</span>
                </td>
                <td className="text-muted">
                  <Icon name="user" /> {pr.submitter?.name ?? "Unknown"}
                </td>
              </tr>
            ))}
            {!pulls.length && (
              <tr>
                <td colSpan={4} className="text-center text-muted py-5">
                  No pull requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </IssueDetailShell>
  );
}
