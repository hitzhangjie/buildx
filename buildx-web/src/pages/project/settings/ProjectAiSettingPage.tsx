import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

const AI_MODELS = [
  "claude-sonnet-4-20250514",
  "gpt-4o",
  "gpt-4o-mini",
  "gemini-2.5-flash",
  "deepseek-v3",
];

export default function ProjectAiSettingPage() {
  const { projectPath } = useProject();
  const [aiEnabled, setAiEnabled] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0]);
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({
      type: "info",
      message: `AI settings saved. Model: ${selectedModel}, Enabled: ${aiEnabled}`,
    });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="AI Setting">
      <div className="card">
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
    </SettingsLayout>
  );
}
