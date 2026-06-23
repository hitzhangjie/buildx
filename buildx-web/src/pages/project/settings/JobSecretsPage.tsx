import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

interface JobSecret {
  id: string;
  name: string;
  maskedValue: string;
  revealed: boolean;
}

export default function JobSecretsPage() {
  const { projectPath } = useProject();

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
    <SettingsLayout projectPath={projectPath} pageTitle="Job Secrets">
      <div className="card">
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
    </SettingsLayout>
  );
}
