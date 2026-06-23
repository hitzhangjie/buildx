import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface IterationDetail {
  id: number;
  name: string;
  startDate: string;
  dueDate: string;
  description: string;
}

const MOCK_ITERATION: IterationDetail | null = null;

const TABS = [
  { id: "issues", label: "Issues", href: "" },
  { id: "burndown", label: "Burndown", href: "/burndown" },
  { id: "edit", label: "Edit", href: "/edit" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  iterationId,
}: {
  activeTab: string;
  projectPath: string;
  iterationId: number;
}) {
  const base = `/${projectPath}/~iterations/${iterationId}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mirrors OneDev IterationEditPage.
 * Reference: references/onedev/.../web/page/project/issues/iteration/IterationEditPage.html
 */
export function IterationEditPage() {
  const { projectPath } = useProject();
  const { iterationId } = useParams<{ iterationId: string }>();
  const id = parseInt(iterationId ?? "0", 10);

  const [name, setName] = useState(MOCK_ITERATION?.name ?? "");
  const [startDate, setStartDate] = useState(MOCK_ITERATION?.startDate ?? "");
  const [dueDate, setDueDate] = useState(MOCK_ITERATION?.dueDate ?? "");
  const [description, setDescription] = useState(MOCK_ITERATION?.description ?? "");
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
      // TODO: call actual update iteration API
      // await fetch(`/~api/projects/${projectPath}/iterations/${id}`, {
      //   method: "PUT",
      //   body: JSON.stringify({ name, startDate, dueDate, description }),
      // });
    } catch (err) {
      setErrors([
        (err as { message?: string }).message ?? "Failed to update iteration.",
      ]);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ProjectLayout
      projectPath={projectPath}
      pageTitle={
        MOCK_ITERATION ? `${MOCK_ITERATION.name} - Edit` : "Edit Iteration"
      }
    >
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex align-items-center mb-3">
            <h4 className="mb-0 mr-3">{MOCK_ITERATION?.name}</h4>
          </div>

          <TabNav activeTab="edit" projectPath={projectPath} iterationId={id} />

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
            <div className="form-group">
              <label className="font-weight-bold">Description</label>
              <textarea
                className="form-control"
                rows={4}
                placeholder="Iteration description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="d-flex align-items-center">
              <button
                className="btn btn-primary font-weight-bold mr-3"
                type="submit"
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save"}
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
