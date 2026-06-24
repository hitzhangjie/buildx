import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { createProjectIssue } from "../../../api/issues";
import { fetchProjectIterations } from "../../../api/iterations";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
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
  const [selectedIterationIds, setSelectedIterationIds] = useState<number[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: iterations } = useAsyncResource(
    () => fetchProjectIterations(projectPath),
    [projectPath],
  );

  function toggleIteration(id: number) {
    setSelectedIterationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);

    if (!title.trim()) {
      setErrors(["Title is required."]);
      return;
    }

    setSubmitting(true);
    try {
      const created = await createProjectIssue(projectPath, title.trim(), description, {
        iterationIds: selectedIterationIds.length > 0 ? selectedIterationIds : undefined,
      });
      navigate(`/${projectPath}/~issues/${created.number}`, { replace: true });
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
            {(iterations?.length ?? 0) > 0 && (
              <div className="form-group">
                <label className="font-weight-bold">Iterations</label>
                <div className="d-flex flex-wrap">
                  {iterations!.map((iter) => (
                    <label
                      key={iter.id}
                      className="btn btn-sm btn-outline-secondary mr-2 mb-2"
                    >
                      <input
                        type="checkbox"
                        className="mr-1"
                        checked={selectedIterationIds.includes(iter.id)}
                        onChange={() => toggleIteration(iter.id)}
                      />
                      {iter.name}
                    </label>
                  ))}
                </div>
              </div>
            )}
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
