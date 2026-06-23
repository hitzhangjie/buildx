import { useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type SsoAccount = {
  id: number;
  providerName: string;
  linkedAccount: string;
};

/**
 * Mirrors OneDev MySsoAccountsPage.html.
 * Reference: references/onedev/.../web/page/my/MySsoAccountsPage.html
 */
export function MySsoAccountsPage() {
  const [accounts, setAccounts] = useState<SsoAccount[]>([
    { id: 1, providerName: "GitHub", linkedAccount: "github-user" },
    { id: 2, providerName: "Google", linkedAccount: "google-user@gmail.com" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleUnlink(id: number) {
    try {
      // TODO: wire to API
      setAccounts((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to unlink account"]);
    }
  }

  return (
    <Layout title="SSO Accounts">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">SSO Accounts</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <table className="table">
              <thead>
                <tr>
                  <th>Provider</th>
                  <th>Linked Account</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No linked SSO accounts
                    </td>
                  </tr>
                )}
                {accounts.map((account) => (
                  <tr key={account.id}>
                    <td>
                      <strong>{account.providerName}</strong>
                    </td>
                    <td>{account.linkedAccount}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleUnlink(account.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Unlink
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
