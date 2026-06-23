import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";

export default function DefaultFixedIssueFiltersPage() {
  const { projectPath } = useProject();

  const [filterQuery, setFilterQuery] = useState(
    'Milestone is not empty and Fixed in Build is not empty'
  );
  const [feedback, setFeedback] = useState<{
    type: "info" | "danger";
    message: string;
  } | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setFeedback({
      type: "info",
      message: "Default fixed issue filter saved.",
    });
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Default Fixed Issue Filters">
      <div className="card">
        <div className="card-body">
          <FormFeedbackPanel messages={feedback ? [feedback.message] : []} />
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label" htmlFor="filter-query">
                Default Filter Query
              </label>
              <textarea
                id="filter-query"
                className="form-control font-monospace"
                rows={3}
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Enter filter expression..."
              />
              <div className="form-text">
                The default query used when viewing fixed issues. Use OneDev query syntax to
                filter by milestone, build, state, and other fields.
              </div>
            </div>
            <div className="bg-light p-3 rounded mb-3">
              <small className="text-muted">
                <strong>Examples:</strong>
                <br />
                <code>Milestone is not empty and Fixed in Build is not empty</code>
                <br />
                <code>State is Closed and Fixed in Build is not empty</code>
              </small>
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
