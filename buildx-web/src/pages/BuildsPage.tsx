import { Link } from "react-router-dom";
import { fetchBuilds, type Build } from "../api/builds";
import { EmptyListState } from "../components/global-list/EmptyListState";
import { DEFAULT_QUERY_LINKS, ResourceListPanel } from "../components/global-list/ResourceListPanel";
import { SideMainPage } from "../components/global-list/SideMainPage";
import { useAsyncResource } from "../hooks/useAsyncResource";

function buildStatusIcon(status: Build["status"]): string {
  switch (status) {
    case "SUCCESSFUL":
      return "tick-circle";
    case "FAILED":
      return "cancel";
    case "RUNNING":
      return "spin";
    case "CANCELLED":
      return "stop";
    default:
      return "clock";
  }
}

function BuildRow({ build }: { build: Build }) {
  return (
    <div className="build-item border-bottom py-4">
      <div className="d-flex flex-wrap row-gap-2 align-items-center">
        <Link
          to={`/${build.projectPath}/~builds/${build.number}`}
          className="text-nowrap mr-2"
        >
          <img
            src={`/~icon/${buildStatusIcon(build.status)}.svg`}
            alt=""
            className="icon mr-1"
            width={16}
            height={16}
          />
          {build.job}
        </Link>
        <span className="number text-muted mr-2">#{build.number}</span>
        <span className="badge badge-light mr-2">{build.status}</span>
      </div>
      <div className="text-muted font-size-sm mt-2">
        <img src="/~icon/project.svg" alt="" className="icon mr-1" width={14} height={14} />
        <Link to={`/${build.projectPath}`}>{build.projectPath}</Link>
        <span className="mx-2">·</span>
        <img src="/~icon/branch.svg" alt="" className="icon mr-1" width={14} height={14} />
        {build.branch}
        <span className="mx-2">·</span>
        {build.submitter}
      </div>
    </div>
  );
}

export function BuildsPage() {
  const { data: builds, loading, error } = useAsyncResource(fetchBuilds, []);

  return (
    <SideMainPage title="Builds">
      <ResourceListPanel
        cardClass="build-list"
        queryPlaceholder="Query/order builds"
        actionIcon="play"
        actionTitle="Run job"
        toolbarLinks={[
          ...DEFAULT_QUERY_LINKS,
          { icon: "select", label: "Display Params" },
        ]}
        count={builds?.length}
        loading={loading}
        error={error}
      >
        {!builds?.length ? (
          <EmptyListState message="No builds yet" />
        ) : (
          <div>{builds.map((build) => <BuildRow key={build.id} build={build} />)}</div>
        )}
      </ResourceListPanel>
    </SideMainPage>
  );
}
