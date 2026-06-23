import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface WebHook {
  id: string;
  url: string;
  events: string[];
  enabled: boolean;
}

export default function WebHooksPage() {
  const { projectPath } = useProject();

  const [webhooks, setWebhooks] = useState<WebHook[]>([
    {
      id: "1",
      url: "https://hooks.example.com/buildx",
      events: ["push", "pull_request"],
      enabled: true,
    },
  ]);

  const toggleEnabled = (id: string) => {
    setWebhooks((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    );
  };

  const handleRemove = (id: string) => {
    setWebhooks((prev) => prev.filter((w) => w.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Web Hooks">
      <div className="card">
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
          <button type="button" className="btn btn-primary btn-sm">
            <Icon name="plus" className="me-1" />
            Add Webhook
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
