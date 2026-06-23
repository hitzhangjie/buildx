import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchServerInfo } from "../api/info";
import { fetchProjects, type Project } from "../api/projects";
import { Layout } from "../layout/Layout";

export function ProjectsPage() {
  const [version, setVersion] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [info, list] = await Promise.all([fetchServerInfo(), fetchProjects()]);
        if (cancelled) {
          return;
        }
        setVersion(`${info.name} ${info.version}`);
        setProjects(Array.isArray(list) ? list : []);
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load projects");
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
  }, []);

  return (
    <Layout title="Projects">
      <div className="side-main side-main-wrap p-2 p-sm-5">
        <div className="side d-none d-xl-block">
          <div className="card card-custom">
            <div className="card-body">
              <div className="font-weight-bold mb-3">Saved Queries</div>
              <div className="text-muted font-size-sm">No saved queries</div>
            </div>
          </div>
        </div>
        <div className="main">
          <div className="d-flex align-items-center justify-content-between mb-4">
            <h4 className="font-weight-bold mb-0">Projects</h4>
            <div className="d-flex align-items-center">
              {version && <span className="text-muted font-size-sm mr-3">{version}</span>}
              <Link to="/~projects/new" className="btn btn-sm btn-primary">
                <img src="/~icon/plus.svg" alt="" className="icon mr-1" width={14} height={14} />
                New Project
              </Link>
            </div>
          </div>

          {error && <div className="alert alert-light-danger">{error}</div>}

          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : projects.length === 0 ? (
            <div className="card card-custom">
              <div className="card-body text-center py-10">
                <img src="/~icon/empty.svg" alt="" className="mb-5" width={64} height={64} />
                <div className="text-muted">No projects yet</div>
              </div>
            </div>
          ) : (
            <div className="card card-custom">
              <div className="card-body p-0">
                <table className="table table-hover mb-0">
                  <thead>
                    <tr>
                      <th>Path</th>
                      <th>Key</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projects.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <Link to={`/${p.path}`}>
                            <img
                              src="/~icon/project.svg"
                              alt=""
                              className="icon mr-2"
                              width={16}
                              height={16}
                            />
                            {p.path}
                          </Link>
                        </td>
                        <td className="text-muted">{p.key}</td>
                        <td>{p.name}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
