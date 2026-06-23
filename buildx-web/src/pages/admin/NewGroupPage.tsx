import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev NewGroupPage.html.
 * Reference: references/onedev/.../web/page/admin/group/NewGroupPage.html
 */
export function NewGroupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      navigate("/~administration/groups");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to create group"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New Group">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">New Group</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSubmit}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">Name</label>
                <input
                  type="text"
                  className="form-control"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  required
                />
              </div>

              <div className="form-group">
                <label className="control-label">Description</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
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
                onClick={() => navigate("/~administration/groups")}
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
