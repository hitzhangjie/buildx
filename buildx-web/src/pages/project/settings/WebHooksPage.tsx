import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { Link } from "react-router-dom";

interface WebHook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export default function WebHooksPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [webhooks, setWebhooks] = useState<WebHook[]>([
    {
      id: "1",
      url: "https://hooks.example.com/buildx",
      events: ["push", "pull_request"],
      enabled: true,
    },
  ]);

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

  const toggleEnabled = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleRemove = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Web Hooks">
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
                    className={`nav-link ${item.label === "WebHooks" ? "active" : ""}`}
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
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">Web Hooks</h5>
              <button className="btn btn-primary btn-sm">
                <Icon name="plus" className="me-1" />
                Add Webhook
              </button>
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>URL</th>
                    <th>Events</th>
                    <th>Status</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {webhooks.map((hook) => (
                    <tr key={hook.id}>
                      <td className="font-monospace small">{hook.url}</td>
                      <td>{hook.events.join(", ")}</td>
                      <td>
                        <span
                          className={`badge ${hook.enabled ? "bg-success" : "bg-secondary"}`}
                        >
                          {hook.enabled ? "Enabled" : "Disabled"}
                        </span>
                      </td>
                      <td className="text-end">
                        <button
                          className="btn btn-sm btn-link me-2"
                          onClick={() => toggleEnabled(hook.id)}
                        >
                          <Icon name={hook.enabled ? "pause" : "play"} />
                        </button>
                        <button className="btn btn-sm btn-link me-2">
                          <Icon name="edit" />
                        </button>
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={() => handleRemove(hook.id)}
                        >
                          <Icon name="remove" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {webhooks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted text-center">
                        No webhooks configured.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
