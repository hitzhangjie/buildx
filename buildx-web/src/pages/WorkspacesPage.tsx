import { useState } from "react";
import { Link } from "react-router-dom";
import { fetchWorkspaces, type Workspace } from "../api/workspaces";
import { WorkspaceStatusIcon } from "../components/onedev/WorkspaceStatusIcon";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { buildProjectScopedHref } from "../data/queryPresets";
import { useAsyncResource } from "../hooks/useAsyncResource";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

function WorkspaceRow({ workspace }: { workspace: Workspace }) {
  const projectPath = workspace.project?.path ?? "";
  const userName = workspace.user?.fullName ?? workspace.user?.name ?? "";

  return (
    <tr>
      <td className="workspace">
        <Link to={`/${projectPath}/~workspaces/${workspace.number}`}>
          <WorkspaceStatusIcon status={workspace.status} className="icon mr-1" />
          workspace#{workspace.number}
        </Link>
      </td>
      <td className="user d-none d-md-table-cell">
        {userName}
      </td>
      <td className="branch">
        {workspace.branch ? (
          <Link to={`/${projectPath}/~files/HEAD/${workspace.branch}`}>
            {workspace.branch}
          </Link>
        ) : (
          <code className="text-muted">{workspace.commitHash?.substring(0, 7)}</code>
        )}
      </td>
      <td className="spec d-none d-md-table-cell">
        {workspace.specName}
      </td>
      <td className="date d-none d-xl-table-cell">
        {formatDate(workspace.createDate)}
      </td>
    </tr>
  );
}

export function WorkspacesPage() {
  const [query, setQuery] = useState("");
  const { data: workspaces, loading, error } = useAsyncResource(fetchWorkspaces, []);

  return (
    <SideMainPage
      title="Workspaces"
      savedQueries={{
        storageKey: "workspaces:global",
        currentQuery: query,
        onSelectQuery: setQuery,
        buildHref: (q) => buildProjectScopedHref("/~workspaces", q),
      }}
    >
      {(savedQueries) => (
        <ResourceListPanel
          cardClass="workspace-list"
          queryPlaceholder="Query/order workspaces"
          toolbarLinks={DEFAULT_QUERY_LINKS}
          savedQueryToolbar={savedQueries.toolbarActions}
          query={query}
          onQuery={setQuery}
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
                  <th>Workspace</th>
                  <th className="d-none d-md-table-cell">User</th>
                  <th>Branch/Commit</th>
                  <th className="d-none d-md-table-cell">Spec</th>
                  <th className="d-none d-xl-table-cell">Created</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.map((ws) => (
                  <WorkspaceRow key={ws.id} workspace={ws} />
                ))}
              </tbody>
            </table>
          )}
        </ResourceListPanel>
      )}
    </SideMainPage>
  );
}
