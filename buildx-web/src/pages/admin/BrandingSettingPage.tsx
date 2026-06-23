import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev BrandingSettingPage.html.
 * Reference: references/onedev/.../web/page/admin/branding/BrandingSettingPage.html
 */
export function BrandingSettingPage() {
  const [siteName, setSiteName] = useState("BuildX");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save branding"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Branding">
      <div className="m-2 m-sm-5">
        <div className="card">
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">Site Name</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    required
                  />
                </div>
                <div className="text-muted form-text">
                  The name displayed in the browser title bar and email notifications
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Logo URL</label>
                <div className="clearable-wrapper">
                  <input
                    type="url"
                    className="form-control"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                <div className="text-muted form-text">
                  URL to a custom logo image displayed in the sidebar header
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Favicon URL</label>
                <div className="clearable-wrapper">
                  <input
                    type="url"
                    className="form-control"
                    value={faviconUrl}
                    onChange={(e) => setFaviconUrl(e.target.value)}
                    placeholder="https://example.com/favicon.ico"
                  />
                </div>
                <div className="text-muted form-text">
                  URL to a custom favicon displayed in the browser tab
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
