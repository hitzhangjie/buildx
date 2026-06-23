import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Condition = {
  id: number;
  metric: string;
  operator: string;
  threshold: string;
};

/**
 * Mirrors OneDev AlertSettingPage.html.
 * Reference: references/onedev/.../web/page/admin/alert/AlertSettingPage.html
 */
export function AlertSettingPage() {
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertEmail, setAlertEmail] = useState("admin@example.com");
  const [conditions, setConditions] = useState<Condition[]>([
    { id: 1, metric: "CPU Usage", operator: ">", threshold: "90" },
    { id: 2, metric: "Memory Usage", operator: ">", threshold: "85" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save alert settings"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleAddCondition() {
    setConditions((prev) => [
      ...prev,
      { id: Date.now(), metric: "", operator: ">", threshold: "" },
    ]);
  }

  function handleRemoveCondition(id: number) {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  }

  function handleConditionChange(id: number, field: keyof Condition, value: string) {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  }

  return (
    <Layout title="Alert Settings">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Alert Settings</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">Enable Alerts</label>
                <div className="checkbox-inline">
                  <label className="checkbox">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      checked={alertsEnabled}
                      onChange={(e) => setAlertsEnabled(e.target.checked)}
                    />
                    Enable system alert notifications
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label className="control-label">Alert Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={alertEmail}
                  onChange={(e) => setAlertEmail(e.target.value)}
                  placeholder="admin@example.com"
                />
                <small className="form-text text-muted">
                  Email address to receive alert notifications.
                </small>
              </div>

              <div className="form-group">
                <label className="control-label">Alert Conditions</label>
                {conditions.map((condition) => (
                  <div className="form-row mb-2" key={condition.id}>
                    <div className="col-md-4">
                      <input
                        type="text"
                        className="form-control"
                        value={condition.metric}
                        onChange={(e) =>
                          handleConditionChange(condition.id, "metric", e.target.value)
                        }
                        placeholder="Metric (e.g. CPU Usage)"
                      />
                    </div>
                    <div className="col-md-2">
                      <select
                        className="form-control"
                        value={condition.operator}
                        onChange={(e) =>
                          handleConditionChange(condition.id, "operator", e.target.value)
                        }
                      >
                        <option value=">">{">"}</option>
                        <option value="<">{"<"}</option>
                        <option value=">=">{">="}</option>
                        <option value="<=">{"<="}</option>
                        <option value="=">=</option>
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input
                        type="number"
                        className="form-control"
                        value={condition.threshold}
                        onChange={(e) =>
                          handleConditionChange(condition.id, "threshold", e.target.value)
                        }
                        placeholder="Threshold"
                      />
                    </div>
                    <div className="col-md-2">
                      <span className="form-control-plaintext">%</span>
                    </div>
                    <div className="col-md-1">
                      <button
                        className="btn btn-danger btn-sm"
                        type="button"
                        onClick={() => handleRemoveCondition(condition.id)}
                      >
                        <Icon name="trash" className="icon" width={14} height={14} />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  className="btn btn-link btn-sm"
                  type="button"
                  onClick={handleAddCondition}
                >
                  <Icon name="plus" className="icon mr-1" width={14} height={14} />
                  Add Condition
                </button>
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
