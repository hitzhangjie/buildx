import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Link } from "react-router-dom";

interface JobSecret {
  id: string;
  name: string;
  maskedValue: string;
  revealed: boolean;
}

export default function JobSecretsPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [secrets, setSecrets] = useState<JobSecret[]>([
    { id: "1", name: "DOCKER_TOKEN", maskedValue: "********", revealed: false },
    { id: "2", name: "NPM_TOKEN", maskedValue: "********", revealed: false },
  ]);
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
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

  const toggleReveal = (id: string) => {
    setSecrets((prev) =>
      prev.map((s) => (s.id === id ? { ...s, revealed: !s.revealed } : s))
    );
  };

  const handleDelete = (id: string) => {
    setSecrets((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddSecret = (e: FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newValue.trim()) {
      setFeedback({ type: "danger", message: "Both name and value are required." });
      return;
    }
    const newSecret: JobSecret = {
      id: String(Date.now()),
      name: newName.trim(),
      maskedValue: "********",
      revealed: false,
    };
    setSecrets((prev) => [...prev, newSecret]);
    setNewName("");
    setNewValue("");
    setFeedback({ type: "info", message: `Secret "${newSecret.name}" added.` });
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Job Secrets">
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
                    className={`nav-link ${item.label === "Job Secrets" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">Job Secrets</h5>
            </div>
            <div className="card-body">
              <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />

              <table className="table mb-4">
                <thead>
                  <tr>
                    <th>Secret Name</th>
                    <th>Value</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {secrets.map((secret) => (
                    <tr key={secret.id}>
                      <td>{secret.name}</td>
                      <td className="font-monospace">
                        {secret.revealed ? "plain-text-value" : secret.maskedValue}
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-link me-2"
                          onClick={() => toggleReveal(secret.id)}
                        >
                          <Icon name={secret.revealed ? "hide" : "eye"} />
                        </button>
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={() => handleDelete(secret.id)}
                        >
                          <Icon name="remove" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {secrets.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-muted text-center">
                        No secrets configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <h6 className="mb-3">Add New Secret</h6>
              <form onSubmit={handleAddSecret} className="row g-3">
                <div className="col-md-4">
                  <label className="form-label" htmlFor="secret-name">
                    Secret Name
                  </label>
                  <input
                    id="secret-name"
                    className="form-control"
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. MY_SECRET"
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label" htmlFor="secret-value">
                    Secret Value
                  </label>
                  <input
                    id="secret-value"
                    className="form-control"
                    type="password"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="********"
                  />
                </div>
                <div className="col-md-4 d-flex align-items-end">
                  <button type="submit" className="btn btn-primary">
                    <Icon name="plus" className="me-1" />
                    Add Secret
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
