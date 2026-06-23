import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface MockBuild {
  number: number;
  jobName: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "CANCELLED" | "PENDING";
  branch: string;
  submitter: string;
  date: string;
  commit: string;
}

const MOCK_BUILDS: MockBuild[] = [];

const STATUS_BADGE_CLASS: Record<string, string> = {
  SUCCESSFUL: "badge-light-success",
  FAILED: "badge-light-danger",
  RUNNING: "badge-light-info",
  CANCELLED: "badge-light-secondary",
  PENDING: "badge-light-warning",
};

export function ProjectBuildsPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [localQuery, setLocalQuery] = useState(query);

  const filtered = MOCK_BUILDS.filter(
    (b) =>
      !query ||
      b.jobName.toLowerCase().includes(query.toLowerCase()) ||
      `#${b.number}` === query ||
      b.branch.toLowerCase().includes(query.toLowerCase()),
  );

  function handleQuerySubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (localQuery) {
        next.set("query", localQuery);
      } else {
        next.delete("query");
      }
      return next;
    }, { replace: true });
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Builds">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={handleQuerySubmit}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  autoComplete="off"
                  className="form-control"
                  placeholder="Query/order builds"
                  value={localQuery}
                  onChange={(e) => setLocalQuery(e.target.value)}
                />
                <span className="input-group-append">
                  <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </form>
            <button className="btn btn-primary flex-shrink-0 ml-3" title="Run Job">
              <Icon name="play" /> Run Job
            </button>
          </div>
          <div className="operations mb-4">
            <a href="#saved-queries" className="show-saved-queries text-gray d-inline-block mb-2 mr-4">
              <Icon name="eye" /> Show Saved Queries
            </a>
            <span className="save-query text-gray d-inline-block mb-2 mr-4 opacity-50">
              <Icon name="save" /> Save Query
            </span>
            <span className="filter text-gray mr-4 mb-2 d-inline-block text-nowrap opacity-50">
              <Icon name="filter" /> Filter
            </span>
            <span className="order-by text-gray d-inline-block mb-2 mr-4 opacity-50">
              <Icon name="sort" /> Order By
            </span>
            <span className="operations d-inline-block mb-2 mr-4 text-gray opacity-50">
              <Icon name="ellipsis-circle" /> Operations
            </span>
            <span className="float-right text-gray">{filtered.length}</span>
          </div>
          <div className="body">
            <table className="table">
              <tbody>
                {filtered.map((build) => (
                  <tr key={build.number}>
                    <td>
                      <div className="d-flex flex-wrap align-items-center">
                        <Link
                          to={`/${projectPath}/~builds/${build.number}`}
                          className="font-weight-bold mr-2"
                        >
                          {build.jobName} #{build.number}
                        </Link>
                        <span className={`badge badge-sm font-size-xs mr-2 ${STATUS_BADGE_CLASS[build.status]}`}>
                          {build.status}
                        </span>
                      </div>
                      <div className="text-muted font-size-sm mt-1 d-flex align-items-center flex-wrap">
                        <Icon name="branch" />
                        <span className="ml-1 mr-2">{build.branch}</span>
                        <span className="mx-1">|</span>
                        <Icon name="user" />
                        <span className="ml-1 mr-2">{build.submitter}</span>
                        <span className="mx-1">|</span>
                        <Icon name="calendar" />
                        <span className="ml-1">{build.date}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="text-center text-muted py-5">No builds found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
