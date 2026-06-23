import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MyEntitlementSettingPage.html.
 * Reference: references/onedev/.../web/page/my/MyEntitlementSettingPage.html
 */
export function MyEntitlementSettingPage() {
  const [dailyRequestLimit, setDailyRequestLimit] = useState("100");
  const [tokenLimit, setTokenLimit] = useState("100000");
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
    <Layout title="AI Entitlement Setting">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">AI Entitlement Setting</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">Daily Request Limit</label>
                <input
                  type="number"
                  className="form-control"
                  value={dailyRequestLimit}
                  onChange={(e) => setDailyRequestLimit(e.target.value)}
                  min={1}
                  placeholder="Maximum number of AI requests per day"
                />
                <small className="form-text text-muted">
                  Maximum number of AI requests allowed per day for this user.
                </small>
              </div>

              <div className="form-group">
                <label className="control-label">Token Limit</label>
                <input
                  type="number"
                  className="form-control"
                  value={tokenLimit}
                  onChange={(e) => setTokenLimit(e.target.value)}
                  min={1000}
                  placeholder="Maximum token usage per day"
                />
                <small className="form-text text-muted">
                  Maximum number of tokens (input + output) allowed per day.
                </small>
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
