import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

interface PropertyPair {
  id: string;
  key: string;
  value: string;
}

export default function JobPropertiesPage() {
  const { projectPath } = useProject();

  const [properties, setProperties] = useState<PropertyPair[]>([
    { id: "1", key: "BUILD_ENV", value: "production" },
    { id: "2", key: "LOG_LEVEL", value: "info" },
  ]);
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleKeyChange = (id: string, value: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, key: value } : p))
    );
  };

  const handleValueChange = (id: string, value: string) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, value } : p))
    );
  };

  const handleRemove = (id: string) => {
    setProperties((prev) => prev.filter((p) => p.id !== id));
  };

  const handleAdd = () => {
    const newPair: PropertyPair = {
      id: String(Date.now()),
      key: "",
      value: "",
    };
    setProperties((prev) => [...prev, newPair]);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Job properties saved." });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Job Properties">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <table className="table">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Value</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {properties.map((prop) => (
                  <tr key={prop.id}>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={prop.key}
                        onChange={(e) => handleKeyChange(prop.id, e.target.value)}
                        placeholder="Property key"
                      />
                    </td>
                    <td>
                      <input
                        className="form-control form-control-sm"
                        type="text"
                        value={prop.value}
                        onChange={(e) => handleValueChange(prop.id, e.target.value)}
                        placeholder="Property value"
                      />
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-sm btn-link text-danger"
                        onClick={() => handleRemove(prop.id)}
                      >
                        <Icon name="remove" />
                      </button>
                    </td>
                  </tr>
                ))}
                {properties.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-muted text-center">
                      No properties defined. Click "Add Property" to create one.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <button type="button" className="btn btn-primary btn-sm mb-3" onClick={handleAdd}>
              <Icon name="plus" className="me-1" />
              Add Property
            </button>
            <br />
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
