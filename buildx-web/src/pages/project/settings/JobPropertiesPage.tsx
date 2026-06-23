import { useState, type FormEvent } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { FormFeedbackPanel } from "../../../components/onedev/FormFeedbackPanel";
import { Link } from "react-router-dom";

interface PropertyPair {
  id: string;
  key: string;
  value: string;
}

export default function JobPropertiesPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [properties, setProperties] = useState<PropertyPair[]>([
    { id: "1", key: "BUILD_ENV", value: "production" },
    { id: "2", key: "LOG_LEVEL", value: "info" },
  ]);
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
    <ProjectLayout projectPath={projectPath} pageTitle="Job Properties">
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
                    className={`nav-link ${item.label === "Job Properties" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">Job Properties</h5>
              <button className="btn btn-primary btn-sm" onClick={handleAdd}>
                <Icon name="plus" className="me-1" />
                Add Property
              </button>
            </div>
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
                <button type="submit" className="btn btn-primary">
                  <Icon name="save" className="me-1" />
                  Save
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
