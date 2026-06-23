import { useState } from "react";
import { useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type QueryWatch = {
  id: number;
  queryName: string;
  project: string;
};

type Tab = "issues" | "pull-requests" | "builds";

const TABS: { key: Tab; label: string }[] = [
  { key: "issues", label: "Issues" },
  { key: "pull-requests", label: "Pull Requests" },
  { key: "builds", label: "Builds" },
];

const MOCK_WATCHES: Record<Tab, QueryWatch[]> = {
  issues: [
    { id: 1, queryName: "My Open Issues", project: "buildx-server" },
    { id: 2, queryName: "High Priority", project: "buildx-web" },
  ],
  "pull-requests": [
    { id: 3, queryName: "Open PRs", project: "buildx-server" },
  ],
  builds: [
    { id: 4, queryName: "Failed Builds", project: "buildx-web" },
    { id: 5, queryName: "Release Builds", project: "buildx-server" },
  ],
};

/**
 * Mirrors OneDev MyQueryWatchesPage.html.
 * Reference: references/onedev/.../web/page/my/MyQueryWatchesPage.html
 */
export function MyQueryWatchesPage() {
  const params = useParams();
  const initialTab = (params.tab as Tab) || "issues";
  const [activeTab, setActiveTab] = useState<Tab>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "issues"
  );
  const [watches, setWatches] = useState<Record<Tab, QueryWatch[]>>(MOCK_WATCHES);
  const [errors, setErrors] = useState<string[]>([]);

  function handleDelete(tab: Tab, id: number) {
    try {
      // TODO: wire to API
      setWatches((prev) => ({
        ...prev,
        [tab]: prev[tab].filter((w) => w.id !== id),
      }));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to delete watch"]);
    }
  }

  const currentWatches = watches[activeTab] || [];

  return (
    <Layout title="Query Watches">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Query Watches</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <ul className="nav nav-tabs mb-3">
              {TABS.map((tab) => (
                <li className="nav-item" key={tab.key}>
                  <button
                    className={`nav-link ${activeTab === tab.key ? "active" : ""}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>

            <table className="table">
              <thead>
                <tr>
                  <th>Query Name</th>
                  <th>Project</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentWatches.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No query watches
                    </td>
                  </tr>
                )}
                {currentWatches.map((watch) => (
                  <tr key={watch.id}>
                    <td>{watch.queryName}</td>
                    <td>{watch.project}</td>
                    <td>
                      <button className="btn btn-link btn-sm mr-1">
                        <Icon name="pencil" className="icon mr-1" width={14} height={14} />
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(activeTab, watch.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
