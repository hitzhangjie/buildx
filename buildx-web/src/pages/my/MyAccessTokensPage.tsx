import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";
import {
  type AccessToken,
  createAccessToken,
  deleteAccessToken,
  fetchAccessTokens,
} from "../../api/accessTokens";

/**
 * My Access Tokens page — matches OneDev MyAccessTokensPage.html.
 * Reference: references/onedev/.../web/page/my/accesstoken/MyAccessTokensPage.html
 * Reference: references/onedev/.../web/component/user/accesstoken/
 */
export function MyAccessTokensPage() {
  const [tokens, setTokens] = useState<AccessToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdValue, setCreatedValue] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await fetchAccessTokens();
      if (mountedRef.current) {
        setTokens(list);
        setErrors([]);
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrors([(err as { message?: string }).message ?? "Failed to load access tokens"]);
      }
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();
    return () => {
      mountedRef.current = false;
    };
  }, [load]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    setErrors([]);
    setSubmitting(true);
    try {
      const token = await createAccessToken(newName.trim());
      if (mountedRef.current) {
        setTokens((prev) => [token, ...prev]);
        setNewName("");
        setShowCreate(false);
        if (token.value) {
          setCreatedValue(token.value);
        }
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrors([(err as { message?: string }).message ?? "Failed to create token"]);
      }
    } finally {
      if (mountedRef.current) setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!window.confirm("Do you really want to delete this access token?")) return;
    setDeleting(id);
    try {
      await deleteAccessToken(id);
      if (mountedRef.current) {
        setTokens((prev) => prev.filter((t) => t.id !== id));
      }
    } catch (err) {
      if (mountedRef.current) {
        setErrors([(err as { message?: string }).message ?? "Failed to delete token"]);
      }
    } finally {
      if (mountedRef.current) setDeleting(null);
    }
  }

  function handleCopyValue() {
    if (createdValue) {
      void navigator.clipboard.writeText(createdValue);
    }
  }

  function dismissCreatedValue() {
    setCreatedValue(null);
  }

  function isExpired(token: AccessToken): boolean {
    if (!token.expireDate) return false;
    return new Date(token.expireDate) < new Date();
  }

  return (
    <Layout title="My Access Tokens">
      <div className="container m-2 m-sm-5">
        {/* Notice banner — matches OneDev MyAccessTokensPage.html */}
        <div className="alert alert-notice alert-light mb-5">
          Access token is intended for api access and repository pull/push. It cannot
          be used to sign in to web ui
        </div>

        <FormFeedbackPanel messages={errors} />

        {/* Token value reveal — shown only after creation */}
        {createdValue && (
          <div className="alert alert-success mb-4">
            <h6>Access token created successfully!</h6>
            <p className="mb-2">
              Make sure to copy your access token now. You won't be able to see it
              again!
            </p>
            <div className="input-group mb-2">
              <input
                type="text"
                className="form-control font-monospace"
                value={createdValue}
                readOnly
              />
              <button className="btn btn-outline-secondary" type="button" onClick={handleCopyValue}>
                <Icon name="copy" width={16} height={16} />
              </button>
            </div>
            <button className="btn btn-sm btn-light" type="button" onClick={dismissCreatedValue}>
              Dismiss
            </button>
          </div>
        )}

        {/* Access token list — matches OneDev AccessTokenListPanel.html */}
        <div className="access-tokens">
          {loading ? (
            <div className="text-center text-muted py-5">Loading...</div>
          ) : (
            <ul className="list-unstyled">
              {tokens.map((token) => (
                <li key={token.id} className="access-token mb-5">
                  {/* Token card — matches OneDev AccessTokenPanel.html */}
                  <div className="access-token border rounded">
                    <h6 className="border-bottom px-4 py-3 d-flex align-items-center mb-0">
                      <span className="mr-2">{token.name}</span>
                      <button
                        className="btn btn-xs btn-icon btn-light btn-hover-danger"
                        title="Delete this access token"
                        type="button"
                        disabled={deleting === token.id}
                        onClick={() => handleDelete(token.id)}
                      >
                        <Icon name="trash" width={14} height={14} />
                      </button>
                      {isExpired(token) && (
                        <span className="badge badge-light-danger ml-2">Expired</span>
                      )}
                    </h6>
                    <div className="p-4">
                      <dl className="row mb-0">
                        <dt className="col-sm-3">Created</dt>
                        <dd className="col-sm-9">
                          {new Date(token.createDate).toLocaleDateString()}
                        </dd>
                        <dt className="col-sm-3">Expires</dt>
                        <dd className="col-sm-9">
                          {token.expireDate
                            ? new Date(token.expireDate).toLocaleDateString()
                            : "Never"}
                        </dd>
                        <dt className="col-sm-3">Permissions</dt>
                        <dd className="col-sm-9">
                          {token.hasOwnerPermissions ? "Same as owner" : "Standard"}
                        </dd>
                      </dl>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Create section — matches OneDev addNewLinkFrag / AccessTokenEditPanel.html */}
          {!loading && (
            <div className="new-token-section">
              {!showCreate ? (
                <button
                  className="btn btn-block btn-light"
                  type="button"
                  onClick={() => setShowCreate(true)}
                >
                  <Icon name="plus" className="icon align-middle mr-1" width={16} height={16} />
                  <span>Create New</span>
                </button>
              ) : (
                <form
                  method="post"
                  onSubmit={handleCreate}
                  className="leave-confirm rounded border p-4"
                >
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
                        autoFocus
                      />
                    </div>
                  </div>
                  <div className="actions">
                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={submitting || !newName.trim()}
                    >
                      Save
                    </button>{" "}
                    <button
                      className="btn btn-secondary"
                      type="button"
                      onClick={() => {
                        setShowCreate(false);
                        setNewName("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          {!loading && tokens.length === 0 && !showCreate && (
            <div className="text-center text-muted mt-3">No access tokens</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
