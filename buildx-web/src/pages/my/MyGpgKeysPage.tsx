import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type GpgKey = {
  id: number;
  keyId: string;
  fingerprint: string;
  createdDate: string;
};

/**
 * Mirrors OneDev MyGpgKeysPage.html.
 * Reference: references/onedev/.../web/page/my/MyGpgKeysPage.html
 */
export function MyGpgKeysPage() {
  const [keys, setKeys] = useState<GpgKey[]>([
    { id: 1, keyId: "A1B2C3D4E5F6G7H8", fingerprint: "2048R/A1B2C3D4E5F6G7H8", createdDate: "2025-01-15" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [keyContent, setKeyContent] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      const newKey: GpgKey = {
        id: Date.now(),
        keyId: "NEWKEY1234",
        fingerprint: "2048R/NEWKEY1234",
        createdDate: new Date().toISOString().slice(0, 10),
      };
      setKeys((prev) => [...prev, newKey]);
      setKeyContent("");
      setShowAdd(false);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to add GPG key"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: number) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <Layout title="GPG Keys">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">GPG Keys</h5>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowAdd(!showAdd)}
            >
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              Add Key
            </button>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            {showAdd && (
              <form method="post" onSubmit={handleAdd} className="mb-4">
                <div className="form-group">
                  <label className="control-label">Public Key</label>
                  <textarea
                    className="form-control"
                    rows={8}
                    value={keyContent}
                    onChange={(e) => setKeyContent(e.target.value)}
                    placeholder="Paste your GPG public key here"
                    required
                  />
                </div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  Add
                </button>
                <button
                  className="btn btn-light ml-2"
                  type="button"
                  onClick={() => {
                    setShowAdd(false);
                    setKeyContent("");
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            <table className="table">
              <thead>
                <tr>
                  <th>Key ID</th>
                  <th>Fingerprint</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No GPG keys
                    </td>
                  </tr>
                )}
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td><code>{key.keyId}</code></td>
                    <td><code>{key.fingerprint}</code></td>
                    <td>{key.createdDate}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(key.id)}
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
