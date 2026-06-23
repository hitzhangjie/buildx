import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface MockPullRequest {
  number: number;
  title: string;
  status: "Open" | "Merged" | "Discarded";
  sourceBranch: string;
  targetBranch: string;
  comments: number;
  submitter: string;
  date: string;
}

const MOCK_PRS: MockPullRequest[] = [
  {
    number: 1,
    title: "Add CI pipeline configuration",
    status: "Open",
    sourceBranch: "feature/ci",
    targetBranch: "main",
    comments: 3,
    submitter: "admin",
    date: "2026-06-22",
  },
  {
    number: 2,
    title: "Fix login redirect issue",
    status: "Merged",
    sourceBranch: "bugfix/login",
    targetBranch: "main",
    comments: 1,
    submitter: "dev",
    date: "2026-06-20",
  },
];

const STATUS_BADGE_CLASS: Record<string, string> = {
  Open: "badge-light-warning",
  Merged: "badge-light-success",
  Discarded: "badge-light-danger",
};

export function ProjectPullRequestsPage() {
  const { projectPath } = useProject();
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("query") ?? "";
  const [localQuery, setLocalQuery] = useState(query);

  const filtered = MOCK_PRS.filter(
    (pr) =>
      !query ||
      pr.title.toLowerCase().includes(query.toLowerCase()) ||
      `#${pr.number}` === query,
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
    <ProjectLayout projectPath={projectPath} pageTitle="Pull Requests">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={handleQuerySubmit}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  autoComplete="off"
                  className="form-control"
                  placeholder="Query/order pull requests"
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
            <Link
              to={`/${projectPath}/~pulls/new`}
              className="btn btn-primary flex-shrink-0 ml-3"
              title="New Pull Request"
            >
              <Icon name="plus" /> New Pull Request
            </Link>
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
                {filtered.map((pr) => (
                  <tr key={pr.number}>
                    <td>
                      <div className="d-flex flex-wrap align-items-center">
                        <Link
                          to={`/${projectPath}/~pulls/${pr.number}`}
                          className="font-weight-bold mr-2"
                        >
                          {pr.title}
                        </Link>
                        <span className="text-muted mr-2">#{pr.number}</span>
                        <span className={`badge badge-sm font-size-xs mr-2 ${STATUS_BADGE_CLASS[pr.status]}`}>
                          {pr.status}
                        </span>
                      </div>
                      <div className="text-muted font-size-sm mt-1 d-flex align-items-center flex-wrap">
                        <Icon name="branch" />
                        <span className="mx-1">{pr.sourceBranch}</span>
                        <span className="mx-1 text-muted">&rarr;</span>
                        <span className="mx-1">{pr.targetBranch}</span>
                        <span className="mx-2">|</span>
                        <Icon name="comment" />
                        <span className="ml-1">{pr.comments}</span>
                        <span className="mx-2">|</span>
                        <Icon name="user" />
                        <span className="ml-1">{pr.submitter}</span>
                        <span className="ml-2">{pr.date}</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="text-center text-muted py-5">No pull requests found</td>
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
