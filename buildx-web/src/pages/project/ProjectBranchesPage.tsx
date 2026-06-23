import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface MockBranch {
  name: string;
  isDefault: boolean;
  lastCommit: string;
  lastCommitDate: string;
}

const MOCK_BRANCHES: MockBranch[] = [
  { name: "main", isDefault: true, lastCommit: "a1b2c3d", lastCommitDate: "2026-06-23" },
  { name: "develop", isDefault: false, lastCommit: "e4f5g6h", lastCommitDate: "2026-06-22" },
  { name: "feature/auth", isDefault: false, lastCommit: "i7j8k9l", lastCommitDate: "2026-06-21" },
  { name: "feature/metrics", isDefault: false, lastCommit: "m0n1o2p", lastCommitDate: "2026-06-20" },
  { name: "bugfix/login", isDefault: false, lastCommit: "q3r4s5t", lastCommitDate: "2026-06-19" },
];

export function ProjectBranchesPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  const filtered = MOCK_BRANCHES.filter(
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
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
