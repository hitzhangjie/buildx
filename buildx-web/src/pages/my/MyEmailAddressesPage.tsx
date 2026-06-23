import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type EmailAddress = {
  id: number;
  email: string;
  verified: boolean;
  primary: boolean;
};

/**
 * Mirrors OneDev MyEmailAddressesPage.html.
 * Reference: references/onedev/.../web/page/my/MyEmailAddressesPage.html
 */
export function MyEmailAddressesPage() {
  const [emails, setEmails] = useState<EmailAddress[]>([
    { id: 1, email: "admin@example.com", verified: true, primary: true },
    { id: 2, email: "admin@backup.com", verified: false, primary: false },
  ]);
  const [newEmail, setNewEmail] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      const addr: EmailAddress = {
        id: Date.now(),
        email: newEmail.trim(),
        verified: false,
        primary: false,
      };
      setEmails((prev) => [...prev, addr]);
      setNewEmail("");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to add email"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: number) {
    setEmails((prev) => prev.filter((e) => e.id !== id));
  }

  function handleSetPrimary(id: number) {
    setEmails((prev) =>
      prev.map((e) => ({ ...e, primary: e.id === id }))
    );
  }

  return (
    <Layout title="Email Addresses">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Email Addresses</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <form method="post" onSubmit={handleAdd} className="mb-4">
              <div className="form-row">
                <div className="col">
                  <input
                    type="email"
                    className="form-control"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />
                </div>
                <div className="col-auto">
                  <button
                    className="btn btn-primary"
                    type="submit"
                    disabled={submitting}
                  >
                    <Icon name="plus" className="icon mr-1" width={16} height={16} />
                    Add
                  </button>
                </div>
              </div>
            </form>

            <table className="table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Verified</th>
                  <th>Primary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center text-muted">
                      No email addresses
                    </td>
                  </tr>
                )}
                {emails.map((addr) => (
                  <tr key={addr.id}>
                    <td>{addr.email}</td>
                    <td>
                      {addr.verified ? (
                        <span className="badge badge-success">Verified</span>
                      ) : (
                        <span className="badge badge-warning">Unverified</span>
                      )}
                    </td>
                    <td>
                      {addr.primary ? (
                        <span className="badge badge-primary">Primary</span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      {!addr.verified && (
                        <button
                          className="btn btn-success btn-sm mr-1"
                          onClick={() => {
                            // TODO: wire to API
                          }}
                        >
                          <Icon name="check" className="icon mr-1" width={14} height={14} />
                          Verify
                        </button>
                      )}
                      {!addr.primary && (
                        <button
                          className="btn btn-secondary btn-sm mr-1"
                          onClick={() => handleSetPrimary(addr.id)}
                        >
                          <Icon name="flag" className="icon mr-1" width={14} height={14} />
                          Set Primary
                        </button>
                      )}
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDelete(addr.id)}
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
