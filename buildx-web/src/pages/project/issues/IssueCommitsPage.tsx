import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { IssueDetailShell } from "./IssueDetailShell";

/**
 * Fixing commits tab for issue detail.
 * Mirrors OneDev IssueCommitsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueCommitsPage.html
 */
export function IssueCommitsPage() {
  const { projectPath } = useProject();

  // TODO: fetch fixing commits from API (endpoint not yet implemented)
  // const commits = await fetchIssueCommits(issueId);
  const commits: { id: number; message: string; sha: string; author: string; date: string }[] = [];

  return (
    <IssueDetailShell activeTab="commits">
      <table className="table">
        <thead>
          <tr>
            <th>Message</th>
            <th>Author</th>
            <th>Date</th>
            <th>SHA</th>
          </tr>
        </thead>
        <tbody>
          {commits.map((commit) => (
            <tr key={commit.id}>
              <td>
                <Link
                  to={`/${projectPath}/~commits/${commit.sha}`}
                  className="font-weight-bold"
                >
                  {commit.message}
                </Link>
              </td>
              <td className="text-muted">
                <Icon name="user" /> {commit.author}
              </td>
              <td className="text-muted">{commit.date}</td>
              <td>
                <span className="badge badge-light-secondary font-size-xs">
                  <code>{commit.sha}</code>
                </span>
              </td>
            </tr>
          ))}
          {commits.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-5">
                No fixing commits found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </IssueDetailShell>
  );
}
