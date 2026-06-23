import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface CacheEntry {
  id: string;
  name: string;
  size: string;
  lastUsed: string;
}

export default function CacheManagementPage() {
  const { projectPath } = useProject();
  const [cacheEntries, setCacheEntries] = useState<CacheEntry[]>([
    { id: "1", name: "node_modules", size: "245 MB", lastUsed: "2 hours ago" },
    { id: "2", name: "go-modules", size: "120 MB", lastUsed: "1 day ago" },
    { id: "3", name: "docker-layers", size: "1.2 GB", lastUsed: "3 days ago" },
    { id: "4", name: "maven-repository", size: "890 MB", lastUsed: "1 week ago" },
  ]);

  const handleClear = (id: string) => {
    setCacheEntries((prev) => prev.filter((e) => e.id !== id));
  };

  const handleClearAll = () => {
    setCacheEntries([]);
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Cache Management">
      <div className="card">
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
            <div className="d-flex justify-content-between align-items-center">
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
              <button className="btn btn-danger btn-sm" onClick={handleClearAll}>
                <Icon name="trash" className="me-1" />
                Clear All
              </button>
            </div>
          )}
        </div>
      </div>
    </SettingsLayout>
  );
}
