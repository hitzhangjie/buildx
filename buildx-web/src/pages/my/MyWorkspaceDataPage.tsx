import { useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Workspace = {
  id: number;
  name: string;
  size: string;
  lastAccessed: string;
};

/**
 * Mirrors OneDev MyWorkspaceDataPage.html.
 * Reference: references/onedev/.../web/page/my/MyWorkspaceDataPage.html
 */
export function MyWorkspaceDataPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([
    { id: 1, name: "main-project", size: "256 MB", lastAccessed: "2026-06-20" },
    { id: 2, name: "dev-branch", size: "128 MB", lastAccessed: "2026-06-18" },
    { id: 3, name: "temp-workspace", size: "45 MB", lastAccessed: "2026-05-30" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  const totalSize = "429 MB";

  function handleDelete(id: number) {
    try {
      // TODO: wire to API
      setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to delete workspace"]);
    }
  }

  return (
    <Layout title="Workspace Data">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Workspace Data</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <div className="alert alert-info">
              <Icon name="info" className="icon mr-1" width={16} height={16} />
              Total Workspace Size: <strong>{totalSize}</strong>
            </div>

            <table className="table">
              <thead>
                <tr>
                  <th>Workspace Name</th>
                  <th>Size</th>
                  <th>Last Accessed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {workspaces.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No workspace data
                    </td>
                  </tr>
                )}
                {workspaces.map((ws) => (
                  <tr key={ws.id}>
                    <td>{ws.name}</td>
                    <td>{ws.size}</td>
                    <td>{ws.lastAccessed}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(ws.id)}
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
