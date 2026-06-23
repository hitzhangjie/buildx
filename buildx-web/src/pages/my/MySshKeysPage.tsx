import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type SshKey = {
  id: number;
  title: string;
  fingerprint: string;
  createdDate: string;
};

/**
 * Mirrors OneDev MySshKeysPage.html.
 * Reference: references/onedev/.../web/page/my/MySshKeysPage.html
 */
export function MySshKeysPage() {
  const [keys, setKeys] = useState<SshKey[]>([
    { id: 1, title: "Work Laptop", fingerprint: "SHA256:abc123...", createdDate: "2025-06-01" },
  ]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [keyContent, setKeyContent] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      const newKey: SshKey = {
        id: Date.now(),
        title: title.trim(),
        fingerprint: "SHA256:newkey...",
        createdDate: new Date().toISOString().slice(0, 10),
      };
      setKeys((prev) => [...prev, newKey]);
      setTitle("");
      setKeyContent("");
      setShowAdd(false);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to add SSH key"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: number) {
    setKeys((prev) => prev.filter((k) => k.id !== id));
  }

  return (
    <Layout title="SSH Keys">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">SSH Keys</h5>
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
                  <label className="control-label">Title</label>
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Work Laptop"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="control-label">Key</label>
                  <textarea
                    className="form-control"
                    rows={5}
                    value={keyContent}
                    onChange={(e) => setKeyContent(e.target.value)}
                    placeholder="Paste your public key here"
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
                    setTitle("");
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
                  <th>Title</th>
                  <th>Fingerprint</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No SSH keys
                    </td>
                  </tr>
                )}
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td>{key.title}</td>
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
