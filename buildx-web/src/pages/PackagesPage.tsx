import { Link } from "react-router-dom";
import { fetchPacks, type Pack } from "../api/packs";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { useAsyncResource } from "../hooks/useAsyncResource";

function PackRow({ pack }: { pack: Pack }) {
  return (
    <tr>
      <td>
        <Link to={`/${pack.projectPath}/~packages/${pack.type}/${pack.name}`}>
          <img src="/~icon/package.svg" alt="" className="icon mr-2" width={16} height={16} />
          {pack.name}
        </Link>
      </td>
      <td>
        <Link to={`/${pack.projectPath}`}>{pack.projectPath}</Link>
      </td>
      <td className="text-muted">{pack.version}</td>
      <td className="text-muted">{pack.type}</td>
    </tr>
  );
}

export function PackagesPage() {
  const { data: packs, loading, error } = useAsyncResource(fetchPacks, []);

  return (
    <SideMainPage title="Packages">
      <ResourceListPanel
        cardClass="pack-list"
        queryPlaceholder="Query/order packages"
        toolbarLinks={DEFAULT_QUERY_LINKS}
        count={packs?.length}
        loading={loading}
        error={error}
      >
        {!packs?.length ? (
          <EmptyListState message="No packages yet" />
        ) : (
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th>Name</th>
                <th>Project</th>
                <th>Version</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>{packs.map((pack) => <PackRow key={pack.id} pack={pack} />)}</tbody>
          </table>
        )}
      </ResourceListPanel>
    </SideMainPage>
  );
}
