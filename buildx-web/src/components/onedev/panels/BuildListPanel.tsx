import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { BuildStatusIcon } from "../build/BuildStatusIcon";
import { Icon } from "../Icon";
import {
  ResourcefulListPanel,
  type ListToolbarAction,
} from "./ResourcefulListPanel";
import { formatBuildDate, formatDuration, formatRefName } from "../../../util/build";

const DEFAULT_TOOLBAR: ListToolbarAction[] = [
  { icon: "filter", label: "Filter", className: "opacity-50" },
  { icon: "sort", label: "Order By", className: "opacity-50" },
  { icon: "ellipsis-circle", label: "Operations", className: "opacity-50" },
  { icon: "select", label: "Display Params", className: "d-none d-xl-inline opacity-50" },
];

type BuildListPanelProps = {
  builds: Build[];
  query: string;
  onQueryChange: (query: string) => void;
  loading?: boolean;
  errors?: string[];
  showProject?: boolean;
  projectPath?: string;
  savedQueryToolbar?: ListToolbarAction[];
};

function buildLink(build: Build, projectPath?: string): string {
  const path = projectPath ?? build.project?.path ?? "";
  return `/${path}/~builds/${build.number}`;
}

function lastUpdateDate(build: Build): string {
  return build.finishDate ?? build.runningDate ?? build.pendingDate ?? build.submitDate;
}

function buildDuration(build: Build): string {
  const running = build.runningDuration ?? 0;
  const pending = build.pendingDuration ?? 0;
  const total = running + pending;
  return formatDuration(total);
}

function OnBehalfOf({ build }: { build: Build }) {
  const branch = formatRefName(build.refName);
  const projectPath = build.project?.path ?? "";
  return (
    <div className="text-muted font-size-sm">
      {branch && (
        <>
          <Icon name="branch" />
          <span className="ml-1 mr-2">{branch}</span>
        </>
      )}
      {build.commitHash && (
        <>
          <Icon name="commit" />
          <Link
            to={`/${projectPath}/~commits/${build.commitHash}`}
            className="ml-1 text-muted"
          >
            {build.commitHash.slice(0, 8)}
          </Link>
        </>
      )}
    </div>
  );
}

export function BuildListPanel({
  builds,
  query,
  onQueryChange,
  loading,
  errors,
  showProject = false,
  projectPath,
  savedQueryToolbar = [],
}: BuildListPanelProps) {
  return (
    <ResourcefulListPanel
      cardClass="build-list"
      queryPlaceholder="Query/order builds"
      createLabel="Run job"
      createIcon="play"
      toolbarActions={[...savedQueryToolbar, ...DEFAULT_TOOLBAR]}
      count={builds.length}
      loading={loading}
      errors={errors}
      query={query}
      onQueryChange={onQueryChange}
    >
      <table className="table">
        <thead>
          <tr>
            <th>Build</th>
            <th>On Behalf Of</th>
            <th className="text-nowrap">Duration</th>
            <th className="text-nowrap">Last Update</th>
            {showProject && <th className="text-nowrap">Project</th>}
          </tr>
        </thead>
        <tbody>
          {builds.map((build) => (
            <tr key={build.id}>
              <td>
                <div className="d-flex flex-wrap row-gap-2 align-items-center">
                  <Link to={buildLink(build, projectPath)} className="text-nowrap">
                    <BuildStatusIcon status={build.status} className="mr-1" />
                    <span>{build.jobName}</span>
                  </Link>
                  <span className="number ml-1 mr-2 text-muted">#{build.number}</span>
                </div>
                {build.submitter && (
                  <div className="text-muted font-size-sm mt-1">
                    <Icon name="user" />
                    <span className="ml-1">{build.submitter.name}</span>
                  </div>
                )}
              </td>
              <td>
                <OnBehalfOf build={build} />
              </td>
              <td className="text-nowrap">{buildDuration(build)}</td>
              <td className="text-nowrap text-muted font-size-sm">
                {formatBuildDate(lastUpdateDate(build))}
              </td>
              {showProject && (
                <td className="text-nowrap">
                  {build.project && (
                    <Link to={`/${build.project.path}`}>{build.project.path}</Link>
                  )}
                </td>
              )}
            </tr>
          ))}
          {!loading && builds.length === 0 && (
            <tr>
              <td colSpan={showProject ? 5 : 4} className="text-center text-muted py-5">
                No builds found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </ResourcefulListPanel>
  );
}
