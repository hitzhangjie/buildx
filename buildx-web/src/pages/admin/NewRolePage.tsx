import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Permission = {
  key: string;
  label: string;
  description: string;
};

const ALL_PERMISSIONS: Permission[] = [
  { key: "read_code", label: "Read Code", description: "View source code and files" },
  { key: "write_code", label: "Write Code", description: "Push commits and create branches" },
  { key: "read_issues", label: "Read Issues", description: "View issues" },
  { key: "write_issues", label: "Write Issues", description: "Create and edit issues" },
  { key: "read_builds", label: "Read Builds", description: "View build results" },
  { key: "write_builds", label: "Write Builds", description: "Trigger and cancel builds" },
  { key: "admin_projects", label: "Administer Projects", description: "Full project administration" },
];

/**
 * Mirrors OneDev NewRolePage.html.
 * Reference: references/onedev/.../web/page/admin/role/NewRolePage.html
 */
export function NewRolePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function togglePermission(key: string) {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
      navigate("/~administration/roles");
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to create role"]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="New Role">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">New Role</h5>
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
                  placeholder="Role name"
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

              <div className="form-group">
                <label className="control-label">Permissions</label>
                <div className="border rounded p-3">
                  {ALL_PERMISSIONS.map((perm) => (
                    <div className="checkbox-inline mb-2" key={perm.key}>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedPermissions.has(perm.key)}
                          onChange={() => togglePermission(perm.key)}
                        />
                        <strong>{perm.label}</strong>
                        <br />
                        <small className="text-muted">{perm.description}</small>
                      </label>
                    </div>
                  ))}
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
                onClick={() => navigate("/~administration/roles")}
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
