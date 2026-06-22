import { useEffect, useState } from "react";
import "./App.css";

type ServerInfo = {
  name: string;
  version: string;
  dev: boolean;
};

type Project = {
  id: number;
  name: string;
  path: string;
  key: string;
};

export default function App() {
  const [info, setInfo] = useState<ServerInfo | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [auth, setAuth] = useState<{ user: string; pass: string }>({
    user: "",
    pass: "",
  });

  useEffect(() => {
    fetch("/~api/v1/info")
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setError("无法连接服务器"));
  }, []);

  async function loadProjects() {
    setError(null);
    const token = btoa(`${auth.user}:${auth.pass}`);
    const res = await fetch("/~api/projects", {
      headers: { Authorization: `Basic ${token}` },
    });
    if (!res.ok) {
      setError(res.status === 401 ? "认证失败" : `请求失败 (${res.status})`);
      return;
    }
    setProjects(await res.json());
  }

  return (
    <div className="layout">
      <header className="header">
        <h1>BuildX</h1>
        {info && (
          <p className="muted">
            {info.name} {info.version}
            {info.dev ? " · dev" : ""}
          </p>
        )}
      </header>

      <main className="main">
        <section className="card">
          <h2>项目</h2>
          <p className="muted">使用 Basic Auth 调用 /~api/projects</p>
          <div className="form-row">
            <input
              placeholder="用户名"
              value={auth.user}
              onChange={(e) => setAuth({ ...auth, user: e.target.value })}
            />
            <input
              type="password"
              placeholder="密码"
              value={auth.pass}
              onChange={(e) => setAuth({ ...auth, pass: e.target.value })}
            />
            <button type="button" onClick={loadProjects}>
              加载
            </button>
          </div>
          {error && <p className="error">{error}</p>}
          {projects.length > 0 && (
            <ul className="project-list">
              {projects.map((p) => (
                <li key={p.id}>
                  <strong>{p.path}</strong>
                  <span className="muted"> ({p.key})</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
