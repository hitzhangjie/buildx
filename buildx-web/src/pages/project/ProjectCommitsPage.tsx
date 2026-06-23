import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface MockCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
}

const MOCK_COMMITS: MockCommit[] = [
  { hash: "a1b2c3d", message: "Initial commit", author: "admin", date: "2026-06-20" },
  { hash: "e4f5g6h", message: "Add CI pipeline configuration", author: "admin", date: "2026-06-21" },
  { hash: "i7j8k9l", message: "Fix login redirect issue", author: "dev", date: "2026-06-22" },
  { hash: "m0n1o2p", message: "Update dependencies", author: "admin", date: "2026-06-22" },
  { hash: "q3r4s5t", message: "Add README documentation", author: "dev", date: "2026-06-23" },
];

export function ProjectCommitsPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  const filtered = MOCK_COMMITS.filter(
    (c) => !query || c.message.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Commits">
      <div className="card commit-list no-autofocus m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={(e) => e.preventDefault()}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  autoComplete="off"
                  className="form-control"
                  placeholder="Query/order commits"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="input-group-append">
                  <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </form>
          </div>
          <div className="mb-4">
            <a href="#" className="text-gray d-inline-block mr-4 mb-2 text-nowrap" onClick={(e) => e.preventDefault()}>
              <Icon name="filter" /> Filter
            </a>
            <span className="float-right text-gray">{filtered.length} commits</span>
          </div>
          <div className="body">
            <table className="table">
              <tbody>
                {filtered.map((commit) => (
                  <tr key={commit.hash}>
                    <td>
                      <div className="d-flex flex-wrap align-items-center">
                        <Link
                          to={`/${projectPath}/~commits/${commit.hash}`}
                          className="font-weight-bold mr-2"
                        >
                          {commit.message}
                        </Link>
                        <span className="badge badge-light-secondary font-size-xs mr-2">
                          {commit.hash}
                        </span>
                      </div>
                      <div className="text-muted font-size-sm mt-1">
                        <Icon name="user" /> {commit.author}
                        <span className="mx-2">|</span>
                        {commit.date}
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td className="text-center text-muted py-5">No commits found</td>
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
