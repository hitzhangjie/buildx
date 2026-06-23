import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev SystemSettingPage.html.
 * Reference: references/onedev/.../web/page/admin/system/SystemSettingPage.html
 */
export function SystemSettingPage() {
  const [serverUrl, setServerUrl] = useState("http://localhost:9910");
  const [storagePath, setStoragePath] = useState("/var/buildx/data");
  const [maxUploadSize, setMaxUploadSize] = useState("100");
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
    <Layout title="System Settings">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">System Settings</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">Server URL</label>
                <div className="clearable-wrapper">
                  <input
                    type="url"
                    className="form-control"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    placeholder="https://buildx.example.com"
                  />
                </div>
                <div className="text-muted form-text">
                  The URL used to access the server from external services
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Storage Path</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={storagePath}
                    onChange={(e) => setStoragePath(e.target.value)}
                  />
                </div>
                <div className="text-muted form-text">
                  Path to store data files on the server filesystem
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Max Upload Size (MB)</label>
                <div className="clearable-wrapper">
                  <input
                    type="number"
                    className="form-control"
                    value={maxUploadSize}
                    onChange={(e) => setMaxUploadSize(e.target.value)}
                    min={1}
                  />
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
