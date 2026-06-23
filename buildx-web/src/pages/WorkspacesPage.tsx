import { Link } from "react-router-dom";
import { fetchWorkspaces, type Workspace } from "../api/workspaces";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { useAsyncResource } from "../hooks/useAsyncResource";

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  return (
    <tr>
      <td>
        <Link to={`/${workspace.projectPath}/~workspaces/${workspace.id}`}>
          <img src="/~icon/workspace.svg" alt="" className="icon mr-2" width={16} height={16} />
          {workspace.name}
        </Link>
      </td>
      <td>
        <Link to={`/${workspace.projectPath}`}>{workspace.projectPath}</Link>
      </td>
      <td className="text-muted">{workspace.branch}</td>
      <td>
        <span className="badge badge-light-primary">{workspace.status}</span>
      </td>
      <td className="text-muted">{workspace.owner}</td>
    </tr>
  );
}

export function WorkspacesPage() {
  const { data: workspaces, loading, error } = useAsyncResource(fetchWorkspaces, []);

  return (
    <SideMainPage title="Workspaces">
      <ResourceListPanel
        cardClass="workspace-list"
        queryPlaceholder="Query/order workspaces"
        toolbarLinks={DEFAULT_QUERY_LINKS}
        count={workspaces?.length}
        loading={loading}
        error={error}
      >
        {!workspaces?.length ? (
          <EmptyListState message="No workspaces yet" />
        ) : (
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Branch</th>
                <th>Status</th>
                <th>Owner</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => <WorkspaceRow key={ws.id} workspace={ws} />)}
            </tbody>
          </table>
        )}
      </ResourceListPanel>
    </SideMainPage>
  );
}
