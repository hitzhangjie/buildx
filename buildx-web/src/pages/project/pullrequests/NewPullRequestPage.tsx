import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

export function NewPullRequestPage() {
  const { projectPath } = useProject();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [sourceBranch, setSourceBranch] = useState("");
  const [targetBranch, setTargetBranch] = useState("main");
  const [description, setDescription] = useState("");
  const [formErrors, setFormErrors] = useState<string[]>([]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormErrors([]);

    const errors: string[] = [];
    if (!title.trim()) {
      errors.push("Title is required");
    }
    if (!sourceBranch.trim()) {
      errors.push("Source branch is required");
    }
    if (!targetBranch.trim()) {
      errors.push("Target branch is required");
    }

    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    // Mock submit — navigate back to PR list
    navigate(`/${projectPath}/~pulls`);
  }

  function handleCancel() {
    navigate(`/${projectPath}/~pulls`);
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="New Pull Request">
      <div className="card m-3">
        <div className="card-body">
          <form className="leave-confirm" method="post" onSubmit={handleSubmit}>
            <FormFeedbackPanel messages={formErrors} />
            <div className="mb-4">
              <label className="form-label" htmlFor="title">
                Title <span className="text-danger">*</span>
              </label>
              <div className="clearable-wrapper">
                <input
                  id="title"
                  type="text"
                  className="form-control"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Pull request title"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="sourceBranch">
                Source Branch <span className="text-danger">*</span>
              </label>
              <div className="clearable-wrapper">
                <input
                  id="sourceBranch"
                  type="text"
                  className="form-control"
                  value={sourceBranch}
                  onChange={(e) => setSourceBranch(e.target.value)}
                  placeholder="e.g. feature/my-feature"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="targetBranch">
                Target Branch <span className="text-danger">*</span>
              </label>
              <div className="clearable-wrapper">
                <input
                  id="targetBranch"
                  type="text"
                  className="form-control"
                  value={targetBranch}
                  onChange={(e) => setTargetBranch(e.target.value)}
                  placeholder="e.g. main"
                  required
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the changes in this pull request"
              />
            </div>
            <div className="d-flex align-items-center">
              <button type="submit" className="btn btn-primary mr-3">
                <Icon name="tick" /> Create
              </button>
              <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </ProjectLayout>
  );
}
