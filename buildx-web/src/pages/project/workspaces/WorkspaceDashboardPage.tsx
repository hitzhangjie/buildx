import { useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { fetchWorkspaces, type Workspace } from "../../../api/workspaces";
import { WorkspaceDetailShell } from "./WorkspaceDetailShell";

/**
 * Workspace dashboard page.
 * In OneDev this redirects to the first terminal tab if the workspace is ACTIVE,
 * or shows the provisioning log otherwise. For now we show a summary.
 */
export default function WorkspaceDashboardPage() {
  const { projectPath } = useProject();
  const params = useParams<{ workspace: string }>();
  const workspaceNumber = parseInt(params.workspace ?? "0", 10);

  const { data: workspaces, loading, error } = useAsyncResource(fetchWorkspaces, []);
  const workspacesArr = Array.isArray(workspaces) ? (workspaces as Workspace[]) : [];
  const workspace = workspacesArr.find((w) => w.number === workspaceNumber && w.project?.path === projectPath);

  if (loading) {
    return (
      <div className="p-5 text-center text-muted">Loading workspace...</div>
    );
  }

  if (error || !workspace) {
    return (
      <div className="p-5 text-center text-muted">
        {error ? "Failed to load workspace" : `Workspace #${workspaceNumber} not found`}
      </div>
    );
  }

  return (
    <WorkspaceDetailShell workspace={workspace} activeTab="dashboard">
      <div className="d-flex flex-column flex-grow-1 align-items-center justify-content-center p-5 text-muted">
        <p className="font-size-lg mb-2">
          Workspace is <strong>{workspace.status.toLowerCase()}</strong>
        </p>
        <p className="font-size-sm">
          Created {workspace.createDate ? new Date(workspace.createDate).toLocaleString() : "unknown"}
          {workspace.activeDate && ` · Active since ${new Date(workspace.activeDate).toLocaleString()}`}
          {workspace.inactiveDate && ` · Inactive since ${new Date(workspace.inactiveDate).toLocaleString()}`}
        </p>
      </div>
    </WorkspaceDetailShell>
  );
}
