import { type ReactNode, useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import {
  fetchIssueByNumber,
  formatIssueDate,
  type Issue,
} from "../../../api/issues";
import { fetchIssueSetting, type GlobalIssueSetting } from "../../../api/issueSettings";
import type { Iteration } from "../../../api/iterations";
import { fetchIssueIterations } from "../../../api/issues";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { IssueEditableTitle } from "./IssueEditableTitle";
import { IssueOperationsBar } from "./IssueOperationsBar";
import { IssueSidebar } from "./IssueSidebar";
import "./IssueDetailShell.css";

type TabId = "activities" | "commits" | "pulls" | "builds";

const TABS: { id: TabId; label: string; href: string }[] = [
  { id: "activities", label: "Activities", href: "" },
  { id: "commits", label: "Fixing Commits", href: "/commits" },
  { id: "pulls", label: "Pull Requests", href: "/pulls" },
  { id: "builds", label: "Fixing Builds", href: "/builds" },
];

export interface IssueDetailShellProps {
  activeTab: TabId;
  children: ReactNode;
}

/**
 * Shared layout shell for all issue detail sub-tab pages.
 * Provides the two-column card layout, editable title, operations bar,
 * tab navigation, and sidebar — matching OneDev IssueDetailPage.
 * Reference: references/onedev/.../web/page/project/issues/detail/IssueDetailPage.html
 */
export function IssueDetailShell({ activeTab, children }: IssueDetailShellProps) {
  const { projectPath } = useProject();
  const { issue: issueParam } = useParams<{ issue: string }>();
  const issueNumber = parseInt(issueParam ?? "0", 10);
  const [showSidebar, setShowSidebar] = useState(true);
  const [issueRefresh, setIssueRefresh] = useState(0);
  const [iterationRefresh, setIterationRefresh] = useState(0);

  const {
    data: issue,
    loading: issueLoading,
    error: issueError,
  } = useAsyncResource<Issue | null>(
    () => fetchIssueByNumber(projectPath, issueNumber),
    [projectPath, issueNumber, issueRefresh],
  );

  const { data: issueSetting } = useAsyncResource<GlobalIssueSetting>(
    () => fetchIssueSetting(),
    [],
  );

  const {
    data: iterations,
  } = useAsyncResource<Iteration[]>(
    async () => {
      if (!issue) return [];
      return fetchIssueIterations(issue.id);
    },
    [issue?.id, iterationRefresh],
  );

  const handleIssueUpdate = useCallback(() => {
    setIssueRefresh((n) => n + 1);
    setIterationRefresh((n) => n + 1);
  }, []);

  const base = `/${projectPath}/~issues/${issueNumber}`;

  const pageTitle = issue
    ? `#${issueNumber} ${issue.title}`
    : `Issue #${issueNumber}`;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="card position-relative overflow-hidden issue-detail m-3">
        {/* Header */}
        <div className="card-header d-flex align-items-center flex-nowrap">
          {issueLoading && (
            <div className="card-title flex-grow-1 text-muted">
              Loading issue #{issueNumber}...
            </div>
          )}
          {issue && (
            <IssueEditableTitle
              issue={issue}
              projectPath={projectPath}
              onUpdate={handleIssueUpdate}
            />
          )}
          {issue && (
            <a
              className="more-info side-info flex-shrink-0 ml-3"
              title={showSidebar ? "Hide side info" : "More info"}
              role="button"
              tabIndex={0}
              onClick={() => setShowSidebar((v) => !v)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { setShowSidebar((v) => !v); }
              }}
            >
              <Icon name="ellipsis" className="icon" />
            </a>
          )}
        </div>

        {/* Body */}
        <div className="card-body d-flex position-relative overflow-hidden">
          {/* Error state */}
          {issueError && (
            <div className="flex-grow-1">
              <div className="alert alert-danger" role="alert">
                {issueError}
              </div>
            </div>
          )}

          {/* Not found state */}
          {!issueLoading && !issueError && !issue && (
            <div className="flex-grow-1 text-center py-5 text-muted">
              <h5>Issue #{issueNumber} not found</h5>
              <p>
                <Link to={`/${projectPath}/~issues`} className="btn btn-outline-secondary btn-sm">
                  Back to issue list
                </Link>
              </p>
            </div>
          )}

          {/* Main content */}
          {issue && (
            <div className="main flex-grow-1">
              {/* Operations bar */}
              {issueSetting && (
                <IssueOperationsBar
                  issue={issue}
                  projectPath={projectPath}
                  issueSetting={issueSetting}
                  onIssueUpdate={handleIssueUpdate}
                />
              )}

              {/* Primary panel: submitter + description */}
              <div className="issue-primary border border-dashed border-primary rounded p-4 mb-5">
                <div className="mb-3">
                  <span className="submitter-avatar mr-2">
                    <img
                      src={`/~avatar/${issue.submitter?.name ?? "default"}`}
                      alt=""
                      style={{ width: 40, height: 40, borderRadius: "50%" }}
                    />
                  </span>
                  <strong>{issue.submitter?.name ?? "unknown"}</strong>
                  <span className="text-muted ml-1">
                    opened {formatIssueDate(issue.submitDate)}
                  </span>
                </div>
                {issue.description && (
                  <div className="description white-space-pre-wrap">
                    {issue.description}
                  </div>
                )}
              </div>

              {/* Tab navigation */}
              <ul className="tabs nav nav-tabs nav-tabs-line nav-bold mb-5">
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

              {/* Sub-tab page content */}
              {children}
            </div>
          )}

          {/* Sidebar */}
          {issue && showSidebar && (
            <IssueSidebar
              issue={issue}
              projectPath={projectPath}
              iterations={iterations ?? []}
              onIssueUpdate={handleIssueUpdate}
            />
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
