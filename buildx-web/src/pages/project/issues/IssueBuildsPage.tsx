import { Link } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { IssueDetailShell } from "./IssueDetailShell";

interface BuildSummary {
  id: number;
  number: number;
  jobName: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "CANCELLED" | "PENDING";
  branch: string;
  date: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
  SUCCESSFUL: "badge-light-success",
  FAILED: "badge-light-danger",
  RUNNING: "badge-light-info",
  CANCELLED: "badge-light-secondary",
  PENDING: "badge-light-warning",
};

/**
 * Fixing builds tab for issue detail.
 * Mirrors OneDev IssueBuildsPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueBuildsPage.html
 */
export function IssueBuildsPage() {
  const { projectPath } = useProject();

  // TODO: fetch fixing builds from API (endpoint returns empty for now)
  const builds: BuildSummary[] = [];

  return (
    <IssueDetailShell activeTab="builds">
      <table className="table">
        <thead>
          <tr>
            <th>Build</th>
            <th>Status</th>
            <th>Branch</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {builds.map((build) => (
            <tr key={build.id}>
              <td>
                <Link
                  to={`/${projectPath}/~builds/${build.number}`}
                  className="font-weight-bold"
                >
                  {build.jobName} #{build.number}
                </Link>
              </td>
              <td>
                <span className={`badge badge-sm font-size-xs ${STATUS_BADGE_CLASS[build.status]}`}>
                  {build.status}
                </span>
              </td>
              <td className="text-muted font-size-sm">
                <Icon name="branch" /> {build.branch}
              </td>
              <td className="text-muted">{build.date}</td>
            </tr>
          ))}
          {builds.length === 0 && (
            <tr>
              <td colSpan={4} className="text-center text-muted py-5">
                No fixing builds found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </IssueDetailShell>
  );
}
