import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MyAvatarPage.html.
 * Reference: references/onedev/.../web/page/my/MyAvatarPage.html
 */
export function MyAvatarPage() {
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API upload
      setSubmitting(false);
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to upload avatar"]);
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Edit Avatar">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Edit Avatar</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />
            <div className="text-center mb-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Avatar preview"
                  className="rounded-circle"
                  width={128}
                  height={128}
                  style={{ objectFit: "cover" }}
                />
              ) : (
                <div
                  className="rounded-circle bg-secondary d-inline-flex align-items-center justify-content-center"
                  style={{ width: 128, height: 128 }}
                >
                  <Icon name="user" className="icon text-white" width={48} height={48} />
                </div>
              )}
            </div>
            <form method="post" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="control-label">Choose Image</label>
                <div className="custom-file">
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting || !previewUrl}
              >
                <Icon name="upload" className="icon mr-1" width={16} height={16} />
                Upload
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
