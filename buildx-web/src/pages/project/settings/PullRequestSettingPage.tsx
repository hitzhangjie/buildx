import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

export default function PullRequestSettingPage() {
  const { projectPath } = useProject();

  const [requiredApprovals, setRequiredApprovals] = useState("1");
  const [defaultTargetBranch, setDefaultTargetBranch] = useState("main");
  const [mergeStrategy, setMergeStrategy] = useState("merge-commit");
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Pull request settings saved." });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Pull Request">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="required-approvals">
                Required Approvals
              </label>
              <input
                id="required-approvals"
                className="form-control"
                type="number"
                min="0"
                value={requiredApprovals}
                onChange={(e) => setRequiredApprovals(e.target.value)}
              />
              <div className="form-text">
                Number of approvals required before merge is allowed.
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="default-target-branch">
                Default Target Branch
              </label>
              <input
                id="default-target-branch"
                className="form-control"
                type="text"
                value={defaultTargetBranch}
                onChange={(e) => setDefaultTargetBranch(e.target.value)}
              />
              <div className="form-text">
                Default branch new pull requests target.
              </div>
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="merge-strategy">
                Merge Strategy
              </label>
              <select
                id="merge-strategy"
                className="form-select"
                value={mergeStrategy}
                onChange={(e) => setMergeStrategy(e.target.value)}
              >
                <option value="merge-commit">Merge Commit</option>
                <option value="squash">Squash</option>
                <option value="rebase">Rebase</option>
                <option value="fast-forward">Fast Forward</option>
              </select>
              <div className="form-text">
                Strategy used when merging pull requests.
              </div>
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
