import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

export default function GitPackConfigPage() {
  const { projectPath } = useProject();
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

  const handleChange = (field: string, value: string) => {
    setPackConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({ type: "info", message: "Git pack configuration saved." });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Git Pack">
      <div className="card">
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
    </SettingsLayout>
  );
}
