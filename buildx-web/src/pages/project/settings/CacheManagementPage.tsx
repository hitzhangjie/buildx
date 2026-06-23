import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { Link } from "react-router-dom";

interface CacheEntry {
  id: string;
  name: string;
  size: string;
  lastUsed: string;
}

export default function CacheManagementPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([
    { id: "1", name: "node_modules", size: "245 MB", lastUsed: "2 hours ago" },
    { id: "2", name: "go-modules", size: "120 MB", lastUsed: "1 day ago" },
    { id: "3", name: "docker-layers", size: "1.2 GB", lastUsed: "3 days ago" },
    { id: "4", name: "maven-repository", size: "890 MB", lastUsed: "1 week ago" },
  ]);

  const SETTINGS_NAV = [
    { label: "General", href: `${base}/general` },
    { label: "User Authorizations", href: `${base}/user-authorizations` },
    { label: "Group Authorizations", href: `${base}/group-authorizations` },
    { label: "Avatar", href: `${base}/avatar` },
    { label: "Branch Protections", href: `${base}/branch-protections` },
    { label: "Tag Protections", href: `${base}/tag-protections` },
    { label: "Code Analysis", href: `${base}/code-analysis` },
    { label: "Git Pack", href: `${base}/git-pack` },
    { label: "Pull Request", href: `${base}/pull-request` },
    { label: "Job Secrets", href: `${base}/job-secrets` },
    { label: "Job Properties", href: `${base}/job-properties` },
    { label: "Build Preservations", href: `${base}/build-preservations` },
    { label: "WebHooks", href: `${base}/webhooks` },
    { label: "AI Setting", href: `${base}/ai` },
    { label: "Workspace Specs", href: `${base}/workspace-specs` },
    { label: "Service Desk", href: `${base}/service-desk` },
    { label: "Issue Branch Prefix", href: `${base}/issue-branch-prefix` },
    { label: "State Transitions", href: `${base}/state-transitions` },
    { label: "Default Fixed Issue Filters", href: `${base}/default-fixed-issue-filters` },
    { label: "Cache Management", href: `${base}/cache-management` },
  ];

  const handleClear = (id: string) => {
    setCacheEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    setCacheEntries([]);
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Cache Management">
      <div className="d-flex">
        <div className="side d-none d-xl-block p-3" style={{ minWidth: 220 }}>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">
                <Icon name="settings" className="me-2" />
                Settings
              </h6>
              <nav className="nav flex-column">
                {SETTINGS_NAV.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`nav-link ${item.label === "Cache Management" ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex-grow-1">
          <div className="card card-custom">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Cache Management</h5>
              {cacheEntries.length > 0 && (
                <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
                  <Icon name="trash" className="me-1" />
                  Clear All
                </button>
              )}
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cache Name</th>
                    <th>Size</th>
                    <th>Last Used</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cacheEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>
                        <code>{entry.name}</code>
                      </td>
                      <td>{entry.size}</td>
                      <td className="text-muted">{entry.lastUsed}</td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={() => handleClear(entry.id)}
                        >
                          <Icon name="trash" className="me-1" />
                          Clear
                        </button>
                      </td>
                    </tr>
                  ))}
                  {cacheEntries.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted text-center">
                        No cached entries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
              {cacheEntries.length > 0 && (
                <div className="text-muted small">
                  Total:{" "}
                  {cacheEntries.reduce((acc, e) => {
                    const match = e.size.match(/([\d.]+)\s*(MB|GB)/);
                    if (!match) return acc;
                    const val = parseFloat(match[1]);
                    const unit = match[2];
                    return acc + (unit === "GB" ? val * 1024 : val);
                  }, 0).toFixed(0)}{" "}
                  MB
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
