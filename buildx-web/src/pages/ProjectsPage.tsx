import { useEffect, useState } from "react";
import { Layout } from "../layout/Layout";

type Project = {
  id: number;
  name: string;
  path: string;
  key: string;
};

type ServerInfo = {
  name: string;
  version: string;
};

export function ProjectsPage() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/~api/v1/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setError("无法连接服务器"));
  }, []);

  useEffect(() => {
    fetch("/~api/projects")
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status));
        return r.json();
      })
      .then(setProjects)
      .catch(() => {
        /* 未登录时列表为空，与 OneDev 行为一致 */
      });
  }, []);

  return (
    <Layout title="Projects">
      <div className="page-content">
        <div className="d-flex align-items-center justify-content-between mb-4">
          <h4 className="font-weight-bold mb-0">Projects</h4>
          {info && <span className="text-muted font-size-sm">{info.name} {info.version}</span>}
        </div>

        {error && <div className="alert alert-light-danger">{error}</div>}

        {projects.length === 0 ? (
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
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <a href={`/${p.path}`}>{p.path}</a>
                      </td>
                      <td className="text-muted">{p.key}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
