import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

const MERGE_STRATEGY_OPTIONS = [
  { value: "CREATE_MERGE_COMMIT", label: "Create merge commit" },
  { value: "CREATE_MERGE_COMMIT_IF_NECESSARY", label: "Create merge commit if necessary" },
  { value: "SQUASH_SOURCE_BRANCH_COMMITS", label: "Squash source branch commits" },
  { value: "REBASE_SOURCE_BRANCH_COMMITS", label: "Rebase source branch commits" },
] as const;

export function PullRequestSettingPage() {
  const { projectPath } = useProject();

  const [requiredApprovals, setRequiredApprovals] = useState("1");
  const [defaultTargetBranch, setDefaultTargetBranch] = useState("main");
  const [mergeStrategy, setMergeStrategy] = useState("CREATE_MERGE_COMMIT_IF_NECESSARY");
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Pull request settings saved (local UI only — server persistence pending)." });
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
                {MERGE_STRATEGY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
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
