import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

export default function IssueBranchPrefixPage() {
  const { projectPath } = useProject();

  const [prefix, setPrefix] = useState("feature/issue-{number}");
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({
      type: "info",
      message: "Issue branch prefix saved.",
    });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Issue Branch Prefix">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="branch-prefix">
                Branch Prefix Pattern
              </label>
              <input
                id="branch-prefix"
                className="form-control"
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                placeholder="feature/issue-{number}"
              />
              <div className="form-text">
                Pattern for automatic branch names when creating branches from issues. Use{" "}
                <code>{`{number}`}</code> as a placeholder for the issue number.
              </div>
            </div>
            <div className="bg-light p-3 rounded mb-3">
              <small className="text-muted">
                <strong>Example:</strong> With prefix <code>feature/issue-{`{number}`}</code>,
                creating a branch from issue #42 will produce{" "}
                <code>feature/issue-42</code>.
              </small>
            </div>
            <button type="submit" className="btn btn-primary">
              <Icon name="save" className="me-1" />
              Save
            </button>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}
