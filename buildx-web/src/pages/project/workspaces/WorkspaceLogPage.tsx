import { useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { fetchWorkspaces, type Workspace } from "../../../api/workspaces";
import { WorkspaceDetailShell } from "./WorkspaceDetailShell";

/**
 * Workspace provisioning log page.
 * Mirrors OneDev's WorkspaceLogPage. Shows the provisioning log output.
 */
export default function WorkspaceLogPage() {
  const { projectPath } = useProject();
  const params = useParams<{ workspace: string }>();
  const workspaceNumber = parseInt(params.workspace ?? "0", 10);

  const { data: workspaces, loading } = useAsyncResource(fetchWorkspaces, []);
  const workspacesArr = Array.isArray(workspaces) ? (workspaces as Workspace[]) : [];
  const workspace = workspacesArr.find((w) => w.number === workspaceNumber && w.project?.path === projectPath);

  if (loading || !workspace) {
    return (
      <div className="p-5 text-center text-muted">
        {loading ? "Loading..." : "Workspace not found"}
      </div>
    );
  }

  return (
    <WorkspaceDetailShell workspace={workspace} activeTab="log">
      <div className="log d-flex flex-grow-1 position-relative">
        <div className="log p-4 flex-grow-1">
          <div className="text-muted font-size-sm mb-2">
            Provisioning log for workspace #{workspace.number}
          </div>
          <pre className="bg-light p-3" style={{ minHeight: 200, fontSize: "0.85rem", whiteSpace: "pre-wrap" }}>
            <code>
              {"[info] Workspace created\n" +
                `[info] Spec: ${workspace.specName}\n` +
                `[info] Branch: ${workspace.branch || "N/A"}\n` +
                `[info] Status: ${workspace.status}\n` +
                "[info] Waiting for provisioner..."}
            </code>
          </pre>
        </div>
      </div>
    </WorkspaceDetailShell>
  );
}
