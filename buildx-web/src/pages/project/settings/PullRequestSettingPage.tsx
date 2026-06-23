import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Link } from "react-router-dom";

export default function PullRequestSettingPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [requiredApprovals, setRequiredApprovals] = useState("1");
  const [defaultTargetBranch, setDefaultTargetBranch] = useState("main");
  const [mergeStrategy, setMergeStrategy] = useState("merge-commit");
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const SETTINGS_NAV = [
    { label: "General", href: `${base}/general` },
    { label: "User Authorizations", href: `${base}/user-authorizations` },
    { label: "Group Authorizations", href: `${base}/group-authorizations` },
    { label: "Avatar", href: `${base}/avatar` },
    { label: "Branch Protections", href: `${base}/branch-protections` },
    { label: "Tag Protections", href: `${base}/tag-protections` },
    { label: "Code Analysis", href: `${base}/code-analysis` },
    { label: "Git Pack", href: `${base}/git-pack` },
    { label: "Pull Request", href: `${base}/pull-request` },
    { label: "Job Secrets", href: `${base}/job-secrets` },
    { label: "Job Properties", href: `${base}/job-properties` },
    { label: "Build Preservations", href: `${base}/build-preservations` },
    { label: "WebHooks", href: `${base}/webhooks` },
    { label: "AI Setting", href: `${base}/ai` },
    { label: "Workspace Specs", href: `${base}/workspace-specs` },
    { label: "Service Desk", href: `${base}/service-desk` },
    { label: "Issue Branch Prefix", href: `${base}/issue-branch-prefix` },
    { label: "State Transitions", href: `${base}/state-transitions` },
    { label: "Default Fixed Issue Filters", href: `${base}/default-fixed-issue-filters` },
    { label: "Cache Management", href: `${base}/cache-management` },
  ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Pull request settings saved." });
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Pull Request">
      <div className="d-flex">
        <div className="side d-none d-xl-block p-3" style={{ minWidth: 220 }}>
          <div className="card">
            <div className="card-body">
              <h6 className="mb-3">
                <Icon name="settings" className="me-2" />
                Settings
              </h6>
              <nav className="nav flex-column">
                {SETTINGS_NAV.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    className={`nav-link ${item.label === "Pull Request" ? "active" : ""}`}
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
          </div>
        </div>
        <div className="flex-grow-1">
          <div className="card card-custom">
            <div className="card-header">
              <h5 className="card-title mb-0">Pull Request Settings</h5>
            </div>
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
        </div>
      </div>
    </ProjectLayout>
  );
}
