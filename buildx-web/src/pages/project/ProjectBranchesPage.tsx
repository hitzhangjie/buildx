import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface Branch {
  name: string;
  isDefault: boolean;
  lastCommit: string;
  lastCommitDate: string;
}

const branches: Branch[] = [];

export function ProjectBranchesPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  const filtered = branches.filter(
    (b) => !query || b.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Branches">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={(e) => e.preventDefault()}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  className="form-control"
                  placeholder="Query/order branches"
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
          <table className="table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Last Commit</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((branch) => (
                <tr key={branch.name}>
                  <td>
                    <div className="d-flex align-items-center">
                      <Link to={`/${projectPath}/~files`} className="font-weight-bold mr-2">
                        <Icon name="branch" /> {branch.name}
                      </Link>
                      {branch.isDefault && (
                        <span className="badge badge-light-primary font-size-xs">default</span>
                      )}
                    </div>
                  </td>
                  <td>
                    <Link to={`/${projectPath}/~commits/${branch.lastCommit}`} className="text-muted">
                      {branch.lastCommit}
                    </Link>
                  </td>
                  <td className="text-muted">{branch.lastCommitDate}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">No branches found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
