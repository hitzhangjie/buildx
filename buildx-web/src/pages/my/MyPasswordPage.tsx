import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MyPasswordPage.html.
 * Reference: references/onedev/.../web/page/my/MyPasswordPage.html
 */
export function MyPasswordPage() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (newPassword !== confirmPassword) {
      setErrors(["New password and confirmation do not match"]);
      return;
    }

    setSubmitting(true);
    try {
      // TODO: wire to API
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      navigate("/~my");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to change password"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Change Password">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Change Password</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">Current Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="form-group">
                <label className="control-label">New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="form-group">
                <label className="control-label">Confirm New Password</label>
                <input
                  type="password"
                  className="form-control"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
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
