import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev NewIssuePage.
 * Reference: references/onedev/.../web/page/project/issues/create/NewIssuePage.html
 */
export function NewIssuePage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignee, setAssignee] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!title.trim()) {
      setErrors(["Title is required."]);
      return;
    }

    setSubmitting(true);
    try {
      // TODO: call actual create issue API
      // await fetch(`/~api/projects/${projectPath}/issues`, {
      //   method: "POST",
      //   body: JSON.stringify({ title, description, assignee }),
      // });
      navigate(`/${projectPath}/~issues`, { replace: true });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ?? "Failed to create issue.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Issue">
      <div className="card m-3">
        <div className="card-body">
          <form method="post" onSubmit={handleSubmit}>
            <FormFeedbackPanel messages={errors} />
            <div className="form-group">
              <label className="font-weight-bold">Title</label>
              <input
                type="text"
                className="form-control"
                placeholder="Issue title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="font-weight-bold">Description</label>
              <textarea
                className="form-control"
                rows={6}
                placeholder="Describe the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="font-weight-bold">Assignee</label>
              <input
                type="text"
                className="form-control"
                placeholder="Assignee login name"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-primary font-weight-bold mr-3"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Creating..." : "Create"}
              </button>
              <Link
                to={`/${projectPath}/~issues`}
                className="btn btn-light font-weight-bold"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>
    </ProjectLayout>
  );
}
