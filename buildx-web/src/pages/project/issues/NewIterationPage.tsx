import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { createIteration } from "../../../api/iterations";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev NewIterationPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/NewIterationPage.html
 */
export function NewIterationPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!name.trim()) {
      setErrors(["Name is required."]);
      return;
    }
    if (!startDate) {
      setErrors(["Start date is required."]);
      return;
    }
    if (!dueDate) {
      setErrors(["Due date is required."]);
      return;
    }
    if (new Date(dueDate) <= new Date(startDate)) {
      setErrors(["Due date must be after start date."]);
      return;
    }

    setSubmitting(true);
    try {
      await createIteration(projectPath, name.trim(), startDate, dueDate);
      navigate(`/${projectPath}/~iterations`, { replace: true });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ??
          "Failed to create iteration.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Iteration">
      <div className="card m-3">
        <div className="card-body">
          <form method="post" onSubmit={handleSubmit}>
            <FormFeedbackPanel messages={errors} />
            <div className="form-group">
              <label className="font-weight-bold">Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Iteration name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="font-weight-bold">Start Date</label>
              <input
                type="date"
                className="form-control"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="font-weight-bold">Due Date</label>
              <input
                type="date"
                className="form-control"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
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
                to={`/${projectPath}/~iterations`}
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
