import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MailConnectorPage.html.
 * Reference: references/onedev/.../web/page/admin/mail/MailConnectorPage.html
 */
export function MailConnectorPage() {
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPassword, setSmtpPassword] = useState("");
  const [useTls, setUseTls] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save mail settings"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Mail Service">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Mail Service</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">SMTP Host</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">SMTP Port</label>
                <div className="clearable-wrapper">
                  <input
                    type="number"
                    className="form-control"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    min={1}
                    max={65535}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Username</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Password</label>
                <div className="clearable-wrapper">
                  <input
                    type="password"
                    className="form-control"
                    value={smtpPassword}
                    onChange={(e) => setSmtpPassword(e.target.value)}
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <div className="form-group">
                <div className="checkbox-inline">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={useTls}
                      onChange={(e) => setUseTls(e.target.checked)}
                    />
                    Use TLS
                  </label>
                </div>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="check" className="icon mr-1" width={16} height={16} />
                Save
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
