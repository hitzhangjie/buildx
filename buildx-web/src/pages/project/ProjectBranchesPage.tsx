import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";
import { fetchProjects } from "../../api/projects";
import { fetchBranch, fetchBranches, fetchDefaultBranch } from "../../api/repositories";
import { blobUrl } from "../../util/blobPath";

interface Branch {
  name: string;
  isDefault: boolean;
  lastCommit: string;
  lastCommitDate: string;
}

export function ProjectBranchesPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const projects = await fetchProjects();
        const project = projects.find((item) => item.path === projectPath);
        if (!project) {
          if (!cancelled) {
            setBranches([]);
            setError("Project not found");
          }
          return;
        }

        const [names, defaultBranch] = await Promise.all([
          fetchBranches(project.id),
          fetchDefaultBranch(project.id),
        ]);
        const details = await Promise.all(names.map((name) => fetchBranch(project.id, name)));

        if (!cancelled) {
          setBranches(
            names.map((name, index) => ({
              name,
              isDefault: name === defaultBranch,
              lastCommit: details[index].commitHash.slice(0, 8),
              lastCommitDate: details[index].updated ?? "",
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load branches");
          setBranches([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  const filtered = branches.filter(
    (b) => !query || b.name.toLowerCase().includes(query.toLowerCase()),
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
          {error && <div className="alert alert-light-danger">{error}</div>}
          <table className="table">
            <thead>
              <tr>
                <th>Branch</th>
                <th>Last Commit</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">Loading…</td>
                </tr>
              )}
              {!loading && filtered.map((branch) => (
                <tr key={branch.name}>
                  <td>
                    <div className="d-flex align-items-center">
                      <Link to={blobUrl(projectPath, branch.name, "")} className="font-weight-bold mr-2">
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
              {!loading && filtered.length === 0 && (
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
