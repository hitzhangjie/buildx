import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev SecuritySettingPage.html.
 * Reference: references/onedev/.../web/page/admin/security/SecuritySettingPage.html
 */
export function SecuritySettingPage() {
  const [enableSelfRegister, setEnableSelfRegister] = useState(false);
  const [minPasswordLength, setMinPasswordLength] = useState("8");
  const [enableSso, setEnableSso] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save settings"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Security Settings">
      <div className="m-2 m-sm-5">
        <div className="card">
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">Enable Self-Registration</label>
                <div className="checkbox-inline">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={enableSelfRegister}
                      onChange={(e) => setEnableSelfRegister(e.target.checked)}
                    />
                    Allow users to register themselves
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Minimum Password Length</label>
                <div className="clearable-wrapper">
                  <input
                    type="number"
                    className="form-control"
                    value={minPasswordLength}
                    onChange={(e) => setMinPasswordLength(e.target.value)}
                    min={4}
                    max={128}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Enable SSO</label>
                <div className="checkbox-inline">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={enableSso}
                      onChange={(e) => setEnableSso(e.target.checked)}
                    />
                    Enable single sign-on authentication
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
