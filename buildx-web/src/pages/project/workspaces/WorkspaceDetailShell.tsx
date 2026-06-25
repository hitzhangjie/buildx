import { Link } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { WorkspaceStatusIcon } from "../../../components/onedev/WorkspaceStatusIcon";
import type { Workspace, WorkspaceStatus } from "../../../api/workspaces";
import "./workspace-detail.css";

interface WorkspaceDetailShellProps {
  workspace: Workspace;
  activeTab: "dashboard" | "changes" | "log";
  children: React.ReactNode;
}

function statusLabel(status: WorkspaceStatus): string {
  switch (status) {
    case "ACTIVE":
      return "ACTIVE";
    case "PENDING":
      return "PENDING";
    case "INACTIVE":
      return "INACTIVE";
  }
}

export function WorkspaceDetailShell({ workspace, activeTab, children }: WorkspaceDetailShellProps) {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~workspaces/${workspace.number}`;

  const tabs = [
    { id: "dashboard" as const, label: "Dashboard", href: base },
    { id: "changes" as const, label: "Changes", href: `${base}/changes` },
    { id: "log" as const, label: "Log", href: `${base}/log` },
  ];

  const userName = workspace.user?.fullName ?? workspace.user?.name ?? "Unknown";
  const revisionDesc = workspace.branch
    ? `branch ${workspace.branch}`
    : `commit ${workspace.commitHash?.substring(0, 7)}`;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Workspace #${workspace.number}`}>
      <div className="workspace-detail d-flex flex-column flex-grow-1">
        {/* Header */}
        <div className="head d-flex align-items-center px-3 py-2">
          <div className="left d-flex align-items-center">
            <div className="status text-nowrap mr-3">
              <WorkspaceStatusIcon status={workspace.status} className="mr-2" />
              <span className="font-weight-bolder">{statusLabel(workspace.status)}</span>
            </div>
            <div className="summary mr-3">
              <span className="d-none d-md-inline">{userName} on </span>
              {workspace.branch ? (
                <Link to={`/${projectPath}/~files/HEAD/${workspace.branch}`}>
                  {revisionDesc}
                </Link>
              ) : (
                <code>{workspace.commitHash?.substring(0, 7)}</code>
              )}
              <span className="d-none d-md-inline"> for <span>{workspace.specName}</span></span>
            </div>
          </div>
          <div className="right d-flex align-items-center ml-auto">
            {workspace.status === "INACTIVE" && (
              <button
                className="btn btn-xs btn-icon btn-light btn-hover-primary mr-3"
                title="Reprovision workspace"
                aria-label="Reprovision workspace"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" className="icon">
                  <path d="M8 3a5 5 0 104.546 2.914.5.5 0 00-.908-.417A4 4 0 118 4a3.99 3.99 0 013.015 1.432L11 5.5h2V2l-.5.5A5 5 0 008 3z" fill="currentColor"/>
                </svg>
              </button>
            )}
            <button
              className="btn btn-xs btn-icon btn-light btn-hover-danger"
              title="Delete this workspace"
              aria-label="Delete this workspace"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" className="icon">
                <path d="M5.5 5.5A.5.5 0 016 6v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm2.5 0a.5.5 0 01.5.5v6a.5.5 0 01-1 0V6a.5.5 0 01.5-.5zm3 .5a.5.5 0 00-1 0v6a.5.5 0 001 0V6z" fill="currentColor"/>
                <path fillRule="evenodd" d="M14.5 3a1 1 0 01-1 1H13v9a2 2 0 01-2 2H5a2 2 0 01-2-2V4h-.5a1 1 0 01-1-1V2a1 1 0 011-1H6a1 1 0 011-1h2a1 1 0 011 1h3.5a1 1 0 011 1v1zM4.118 4L4 4.059V13a1 1 0 001 1h6a1 1 0 001-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" fill="currentColor"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="body d-flex flex-column flex-grow-1">
          <ul className="tabs nav nav-tabs nav-tabs-line nav-bold">
            {tabs.map((tab) => (
              <li key={tab.id} className={`nav-item${activeTab === tab.id ? " active" : ""}`}>
                <Link to={tab.href} className="nav-link">
                  {tab.label}
                </Link>
              </li>
            ))}
          </ul>
          {children}
        </div>
      </div>
    </ProjectLayout>
  );
}
