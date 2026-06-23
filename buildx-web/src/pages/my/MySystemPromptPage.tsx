import { type FormEvent, useState } from "react";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

const DEFAULT_PROMPT = "You are a helpful AI assistant integrated into a DevOps platform. Answer questions concisely and accurately based on the context provided.";

/**
 * Mirrors OneDev MySystemPromptPage.html.
 * Reference: references/onedev/.../web/page/my/MySystemPromptPage.html
 */
export function MySystemPromptPage() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setSubmitting(true);
    try {
      // TODO: wire to API
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to save prompt"]);
    } finally {
      setSubmitting(false);
    }
  }

  function handleReset() {
    setPrompt(DEFAULT_PROMPT);
  }

  return (
    <Layout title="AI System Prompt">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">AI System Prompt</h5>
          </div>
          <div className="card-body">
            <form method="post" onSubmit={handleSave}>
              <FormFeedbackPanel messages={errors} />

              <div className="form-group">
                <label className="control-label">System Prompt</label>
                <textarea
                  className="form-control"
                  rows={10}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter custom system prompt for the AI assistant"
                />
                <small className="form-text text-muted">
                  This prompt is sent to the AI model on each request to set context and behavior.
                </small>
              </div>

              <button
                className="btn btn-primary"
                type="submit"
                disabled={submitting}
              >
                <Icon name="check" className="icon mr-1" width={16} height={16} />
                Save
              </button>
              <button
                className="btn btn-light ml-2"
                type="button"
                onClick={handleReset}
              >
                <Icon name="refresh" className="icon mr-1" width={16} height={16} />
                Reset to Default
              </button>
            </form>
          </div>
        </div>
      </div>
    </Layout>
  );
}
