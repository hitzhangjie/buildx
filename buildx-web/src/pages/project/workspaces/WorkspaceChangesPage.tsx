import { useParams } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { fetchWorkspaces, type Workspace } from "../../../api/workspaces";
import { WorkspaceDetailShell } from "./WorkspaceDetailShell";

/**
 * Workspace git changes page.
 * Mirrors OneDev's WorkspaceChangesPage with sidebar file list and diff viewer.
 * Full implementation requires WebSocket-backed git status/diff from the workspace runtime.
 */
export default function WorkspaceChangesPage() {
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
    <WorkspaceDetailShell workspace={workspace} activeTab="changes">
      <div className="workspace-changes d-flex flex-grow-1 position-relative">
        <div className="changes-sidebar autofit d-flex flex-column flex-grow-1 border-right">
          {/* Commit form */}
          <div className="commit-form px-3 pt-2 pb-4">
            <textarea
              className="form-control form-control-sm"
              rows={3}
              placeholder="Commit message"
              style={{ resize: "vertical" }}
            />
            <div className="d-flex btn-group flex-grow-1 mt-4">
              <button className="btn btn-sm btn-primary flex-grow-1">Commit</button>
              <button type="button" className="btn btn-sm btn-icon btn-primary dropdown-toggle flex-grow-0" />
            </div>
          </div>

          {/* Staged section */}
          <div className="file-section staged-section">
            <div className="section-header d-flex align-items-center">
              <span className="font-weight-bold font-size-sm">STAGED</span>
              <span className="badge badge-sm badge-secondary ml-1 mr-2">0</span>
            </div>
          </div>

          {/* Unstaged section */}
          <div className="file-section">
            <div className="section-header d-flex align-items-center">
              <span className="font-weight-bold font-size-sm">UNSTAGED</span>
              <span className="badge badge-sm badge-secondary ml-1 mr-2">0</span>
            </div>
          </div>

          <div className="no-changed-files alert alert-light mx-3">
            No changed files to commit
          </div>
        </div>

        <div className="no-selection autofit d-flex flex-grow-1 align-items-center justify-content-center text-muted text-center">
          Select a file to view changes
        </div>
      </div>
    </WorkspaceDetailShell>
  );
}
