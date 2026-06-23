import { type FormEvent, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createProject } from "../api/projects";
import { Layout } from "../layout/Layout";
import { setFlashMessage } from "../util/flash";

function deriveKey(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  if (!cleaned) {
    return "PROJ";
  }
  return cleaned.length <= 10 ? cleaned : cleaned.slice(0, 10);
}

export function NewProjectPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const parentPath = searchParams.get("parent") ?? "";

  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [description, setDescription] = useState("");
  const [codeManagement, setCodeManagement] = useState(true);
  const [issueManagement, setIssueManagement] = useState(true);
  const [packManagement, setPackManagement] = useState(false);
  const [timeTracking, setTimeTracking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const projectName = name.trim();
      const project = await createProject({
        name: projectName,
        key: key.trim() || deriveKey(projectName),
        description: description.trim(),
        parentPath: parentPath || undefined,
      });
      setFlashMessage("New project created");
      if (codeManagement) {
        navigate(`/${project.path}/~files`, { replace: true });
      } else if (issueManagement) {
        navigate(`/${project.path}/~issues`, { replace: true });
      } else if (packManagement) {
        navigate(`/${project.path}/~packages`, { replace: true });
      } else {
        navigate(`/${project.path}/~children`, { replace: true });
      }
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  const title = parentPath ? "Create Child Project" : "Create Project";

  return (
    <Layout title={title}>
      <div className="card new-project m-2 m-sm-5">
        <div className="card-body">
          {error && <div className="alert alert-light-danger">{error}</div>}
          <form className="leave-confirm" onSubmit={onSubmit}>
            <div className="form-group">
              <label className="font-weight-bold">Name</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <small className="form-text text-muted">
                Project path segment; combined with parent to form full path.
              </small>
            </div>
            {parentPath && (
              <div className="form-group">
                <label className="font-weight-bold">Parent</label>
                <input type="text" className="form-control" value={parentPath} readOnly />
              </div>
            )}
            <div className="form-group">
              <label className="font-weight-bold">Project Key</label>
              <input
                type="text"
                className="form-control"
                placeholder={name ? deriveKey(name) : "Optional"}
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase())}
              />
            </div>
            <div className="form-group">
              <label className="font-weight-bold">Description</label>
              <textarea
                className="form-control"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="checkbox-inline mb-2">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={codeManagement}
                    onChange={(e) => setCodeManagement(e.target.checked)}
                  />
                  Code Management
                </label>
              </div>
              <div className="checkbox-inline mb-2">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={issueManagement}
                    onChange={(e) => setIssueManagement(e.target.checked)}
                  />
                  Issue Management
                </label>
              </div>
              <div className="checkbox-inline mb-2">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={timeTracking}
                    onChange={(e) => setTimeTracking(e.target.checked)}
                  />
                  Time Tracking
                </label>
              </div>
              <div className="checkbox-inline">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    checked={packManagement}
                    onChange={(e) => setPackManagement(e.target.checked)}
                  />
                  Package Management
                </label>
              </div>
            </div>
            <button className="btn btn-primary dirty-aware" type="submit" disabled={submitting}>
              Create
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
