import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Link } from "react-router-dom";

export default function GitPackConfigPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [packConfig, setPackConfig] = useState({
    windowMemory: "32m",
    window: "10",
    depth: "50",
    threads: "4",
    packSizeLimit: "0",
  });
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

  const handleChange = (field: string, value: string) => {
    setPackConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Git pack configuration saved." });
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Git Pack">
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
                    className={`nav-link ${item.label === "Git Pack" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">Git Pack Configuration</h5>
            </div>
            <div className="card-body">
              <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label" htmlFor="window-memory">
                    Window Memory
                  </label>
                  <input
                    id="window-memory"
                    className="form-control"
                    type="text"
                    value={packConfig.windowMemory}
                    onChange={(e) => handleChange("windowMemory", e.target.value)}
                    placeholder="e.g. 32m"
                  />
                  <div className="form-text">Maximum memory per pack window (e.g. 32m, 128m).</div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="window">
                    Window
                  </label>
                  <input
                    id="window"
                    className="form-control"
                    type="text"
                    value={packConfig.window}
                    onChange={(e) => handleChange("window", e.target.value)}
                  />
                  <div className="form-text">Window size for delta compression.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="depth">
                    Depth
                  </label>
                  <input
                    id="depth"
                    className="form-control"
                    type="text"
                    value={packConfig.depth}
                    onChange={(e) => handleChange("depth", e.target.value)}
                  />
                  <div className="form-text">Maximum delta depth.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="threads">
                    Threads
                  </label>
                  <input
                    id="threads"
                    className="form-control"
                    type="text"
                    value={packConfig.threads}
                    onChange={(e) => handleChange("threads", e.target.value)}
                  />
                  <div className="form-text">Number of threads for pack operations.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="pack-size-limit">
                    Pack Size Limit
                  </label>
                  <input
                    id="pack-size-limit"
                    className="form-control"
                    type="text"
                    value={packConfig.packSizeLimit}
                    onChange={(e) => handleChange("packSizeLimit", e.target.value)}
                    placeholder="0 for unlimited"
                  />
                  <div className="form-text">Maximum size of a single pack file (0 = unlimited).</div>
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
