import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import {
  IterationHeader,
  IterationTabNav,
} from "../../../components/onedev/panels/IterationDetailPanel";
import {
  deleteIteration,
  fetchIteration,
  formatIterationDay,
  isoDateToEpochDay,
  updateIteration,
} from "../../../api/iterations";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev IterationEditPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationEditPage.html
 */
export function IterationEditPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();
  const { iteration: iterationParam } = useParams<{ iteration: string }>();
  const id = parseInt(iterationParam ?? "0", 10);

  const { data: iteration, loading, error } = useAsyncResource(
    () => fetchIteration(id),
    [id],
  );

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [description, setDescription] = useState("");
  const [closed, setClosed] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!iteration) {
      return;
    }
    setName(iteration.name);
    setDescription(iteration.description ?? "");
    setClosed(iteration.closed);
    setStartDate(
      iteration.startDay != null ? formatIterationDay(iteration.startDay) : "",
    );
    setDueDate(iteration.dueDay != null ? formatIterationDay(iteration.dueDay) : "");
  }, [iteration]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    if (!iteration) {
      return;
    }

    if (!name.trim()) {
      setErrors(["Name is required."]);
      return;
    }
    if (!startDate || !dueDate) {
      setErrors(["Start and due dates are required."]);
      return;
    }
    if (new Date(dueDate) <= new Date(startDate)) {
      setErrors(["Due date must be after start date."]);
      return;
    }

    setSubmitting(true);
    try {
      await updateIteration(id, {
        projectId: iteration.project?.id ?? 0,
        name: name.trim(),
        description,
        startDay: isoDateToEpochDay(startDate),
        dueDay: isoDateToEpochDay(dueDate),
        closed,
      });
      navigate(`/${projectPath}/~iterations/${id}`, { replace: true });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ?? "Failed to update iteration.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this iteration?")) {
      return;
    }
    try {
      await deleteIteration(id);
      navigate(`/${projectPath}/~iterations`, { replace: true });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ?? "Failed to delete iteration.",
      ]);
    }
  }

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={iteration ? `${iteration.name} - Edit` : "Edit Iteration"}
    >
      <div className="card m-3">
        <div className="card-body">
          {loading && <div className="text-muted mb-3">Loading...</div>}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          {iteration && <IterationHeader iteration={iteration} />}

          <IterationTabNav activeTab="edit" projectPath={projectPath} iterationId={id} />

          <form method="post" onSubmit={handleSubmit}>
            <FormFeedbackPanel messages={errors} />
            <div className="form-group">
              <label className="font-weight-bold">Name</label>
              <input
                type="text"
                className="form-control"
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
            <div className="form-group">
              <label className="font-weight-bold">Description</label>
              <textarea
                className="form-control"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="form-group form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="iteration-closed"
                checked={closed}
                onChange={(e) => setClosed(e.target.checked)}
              />
              <label className="form-check-label font-weight-bold" htmlFor="iteration-closed">
                Closed
              </label>
            </div>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-primary font-weight-bold mr-3"
                type="submit"
                disabled={submitting || !iteration}
              >
                {submitting ? "Saving..." : "Save"}
              </button>
              <Link
                to={`/${projectPath}/~iterations/${id}`}
                className="btn btn-light font-weight-bold mr-3"
              >
                Cancel
              </Link>
              <button
                type="button"
                className="btn btn-outline-danger font-weight-bold ml-auto"
                onClick={() => void handleDelete()}
              >
                Delete
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProjectLayout>
  );
}
