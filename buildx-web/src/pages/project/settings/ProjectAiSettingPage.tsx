import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Link } from "react-router-dom";

const AI_MODELS = [
  "claude-sonnet-4-20250514",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.5-flash",
  "deepseek-v3",
];

export default function ProjectAiSettingPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
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
    setFeedback({
      type: "info",
      message: `AI settings saved. Model: ${selectedModel}, Enabled: ${aiEnabled}`,
    });
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="AI Setting">
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
                    className={`nav-link ${item.label === "AI Setting" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">AI Settings</h5>
            </div>
            <div className="card-body">
              <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between">
                    <span>Enable AI Features</span>
                    <div className="form-check form-switch">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={aiEnabled}
                        onChange={(e) => setAiEnabled(e.target.checked)}
                      />
                    </div>
                  </div>
                  <div className="form-text">
                    When enabled, AI-powered features such as code review suggestions and issue
                    summaries are available for this project.
                  </div>
                </div>

                {aiEnabled && (
                  <div className="mb-3">
                    <label className="form-label" htmlFor="ai-model">
                      AI Model
                    </label>
                    <select
                      id="ai-model"
                      className="form-select"
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                    >
                      {AI_MODELS.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      Select the AI model to use for this project.
                    </div>
                  </div>
                )}

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
