import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import {
  fetchIssuePullRequests,
  pullRequestStatusBadge,
  pullRequestStatusLabel,
  type PullRequest,
} from "../../../api/pullRequests";
import { fetchIssueByNumber } from "../../../api/issues";

const TABS = [
  { id: "activities", label: "Activities", href: "" },
  { id: "commits", label: "Commits", href: "/commits" },
  { id: "pulls", label: "Pull Requests", href: "/pulls" },
  { id: "builds", label: "Builds", href: "/builds" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  issueNumber,
}: {
  activeTab: string;
  projectPath: string;
  issueNumber: number;
}) {
  const base = `/${projectPath}/~issues/${issueNumber}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function IssuePullRequestsPage() {
  const { projectPath } = useProject();
  const { issue } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issue ?? "0", 10);
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [issueTitle, setIssueTitle] = useState("");
  const [issueState, setIssueState] = useState("Open");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!issueNumber) {
      return;
    }
    let cancelled = false;
    setLoading(true);
    void Promise.all([
      fetchIssueByNumber(projectPath, issueNumber),
      fetchIssuePullRequests(projectPath, issueNumber),
    ])
      .then(([issueData, prList]) => {
        if (cancelled) return;
        if (issueData) {
          setIssueTitle(issueData.title);
          setIssueState(issueData.state);
        }
        setPulls(prList);
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, issueNumber]);

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={`Issue #${issueNumber} - Pull Requests`}
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">
              {issueTitle || `Issue #${issueNumber}`}
            </h4>
            <span className="badge badge-light-warning font-size-sm">{issueState}</span>
          </div>

          <TabNav activeTab="pulls" projectPath={projectPath} issueNumber={issueNumber} />

          {loading ? (
            <div className="text-center text-muted py-5">Loading…</div>
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
        </div>
      </div>
    </ProjectLayout>
  );
}
