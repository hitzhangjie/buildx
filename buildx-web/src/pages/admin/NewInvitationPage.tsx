import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";
import { createInvitations } from "../../api/invitations";

type RoleOption = {
  value: string;
  label: string;
};

const ROLES: RoleOption[] = [
  { value: "developer", label: "Developer" },
  { value: "viewer", label: "Viewer" },
  { value: "admin", label: "Administrator" },
];

/**
 * Mirrors OneDev NewInvitationPage.html.
 * Reference: references/onedev/.../web/page/admin/invitation/NewInvitationPage.html
 */
export function NewInvitationPage() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("developer");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      const emailAddresses = emails
        .split(/\r?\n/)
        .map((it) => it.trim())
        .filter(Boolean);
      if (emailAddresses.length === 0) {
        throw new Error("Please input at least one email address");
      }
      await createInvitations({ emailAddresses, role });
      navigate("/~administration/invitations");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to send invitation"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New Invitation">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">New Invitation</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">Email Address(es)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  value={emails}
                  onChange={(e) => setEmails(e.target.value)}
                  placeholder="Enter one or more email addresses, one per line"
                  required
                />
                <small className="form-text text-muted">
                  Enter email addresses of people to invite, one per line.
                </small>
              </div>

              <div className="form-group">
                <label className="control-label">Role</label>
                <select
                  className="form-control"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="send" className="icon mr-1" width={16} height={16} />
                Send
              </button>
              <button
                className="btn btn-light ml-2"
                type="button"
                onClick={() => navigate("/~administration/invitations")}
              >
                Cancel
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
