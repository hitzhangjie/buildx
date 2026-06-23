import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type AccessToken = {
  id: number;
  name: string;
  createdDate: string;
  lastUsed: string;
};

/**
 * Mirrors OneDev MyAccessTokensPage.html.
 * Reference: references/onedev/.../web/page/my/MyAccessTokensPage.html
 */
export function MyAccessTokensPage() {
  const [tokens, setTokens] = useState<AccessToken[]>([
    { id: 1, name: "Default Token", createdDate: "2025-01-15", lastUsed: "2026-06-22" },
    { id: 2, name: "CI Token", createdDate: "2025-03-20", lastUsed: "2026-06-23" },
  ]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      const newToken: AccessToken = {
        id: Date.now(),
        name: newName.trim(),
        createdDate: new Date().toISOString().slice(0, 10),
        lastUsed: "Never",
      };
      setTokens((prev) => [...prev, newToken]);
      setNewName("");
      setShowCreate(false);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to create token"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleRevoke(id: number) {
    setTokens((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <Layout title="Access Tokens">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Access Tokens</h5>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreate(!showCreate)}
            >
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New Token
            </button>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            {showCreate && (
              <form method="post" onSubmit={handleCreate} className="mb-4">
                <div className="form-group">
                  <label className="control-label">Token Name</label>
                  <div className="clearable-wrapper">
                    <input
                      type="text"
                      className="form-control"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Enter token name"
                      required
                    />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  type="submit"
                  disabled={submitting}
                >
                  Create
                </button>
                <button
                  className="btn btn-light ml-2"
                  type="button"
                  onClick={() => {
                    setShowCreate(false);
                    setNewName("");
                  }}
                >
                  Cancel
                </button>
              </form>
            )}

            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Last Used</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {tokens.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No access tokens
                    </td>
                  </tr>
                )}
                {tokens.map((token) => (
                  <tr key={token.id}>
                    <td>{token.name}</td>
                    <td>{token.createdDate}</td>
                    <td>{token.lastUsed}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRevoke(token.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Revoke
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
