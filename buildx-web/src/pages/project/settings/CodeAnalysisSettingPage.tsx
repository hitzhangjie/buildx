import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

interface CodeAnalysisRule {
  id: string;
  name: string;
  enabled: boolean;
}

export default function CodeAnalysisSettingPage() {
  const { projectPath } = useProject();

  const [enabled, setEnabled] = useState(true);
  const [rules, setRules] = useState<CodeAnalysisRule[]>([
    { id: "1", name: "Checkstyle", enabled: true },
    { id: "2", name: "PMD", enabled: false },
    { id: "3", name: "SpotBugs", enabled: true },
  ]);
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Code analysis settings saved." });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Code Analysis">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <div className="d-flex align-items-center justify-content-between">
                <span>Enable Code Analysis</span>
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    checked={enabled}
                    onChange={(e) => setEnabled(e.target.checked)}
                  />
                </div>
              </div>
            </div>

            {enabled && (
              <div className="mb-4">
                <h6 className="mb-3">Analysis Rules</h6>
                <div className="list-group">
                  {rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="list-group-item d-flex align-items-center justify-content-between"
                    >
                      <span>{rule.name}</span>
                      <div className="form-check form-switch">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          role="switch"
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                        />
                      </div>
                    </div>
                  ))}
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
    </SettingsLayout>
  );
}
