import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev NewUserPage.html.
 * Reference: references/onedev/.../web/page/admin/user/NewUserPage.html
 */
export function NewUserPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      navigate("/~administration/users");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to create user"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New User">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">New User</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />
              <div className="form-group">
                <label className="control-label">Name</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Full Name</label>
                <div className="clearable-wrapper">
                  <input
                    type="text"
                    className="form-control"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Email</label>
                <div className="clearable-wrapper">
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="control-label">Password</label>
                <div className="clearable-wrapper">
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              </div>
              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="check" className="icon mr-1" width={16} height={16} />
                Create
              </button>
              <button
                className="btn btn-light ml-2"
                type="button"
                onClick={() => navigate("/~administration/users")}
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
