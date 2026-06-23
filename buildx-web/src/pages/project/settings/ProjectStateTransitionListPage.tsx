import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { Link } from "react-router-dom";

interface StateTransition {
  id: string;
  fromState: string;
  toState: string;
  condition: string;
}

export default function ProjectStateTransitionListPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [transitions, setTransitions] = useState<StateTransition[]>([
    { id: "1", fromState: "Open", toState: "In Progress", condition: "Assignee set" },
    { id: "2", fromState: "In Progress", toState: "Resolved", condition: "All tasks completed" },
    { id: "3", fromState: "Resolved", toState: "Closed", condition: "Verified" },
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

  const handleRemove = (id: string) => {
    setTransitions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="State Transitions">
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
                    className={`nav-link ${item.label === "State Transitions" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">Issue State Transitions</h5>
              <button className="btn btn-primary btn-sm">
                <Icon name="plus" className="me-1" />
                Add Transition
              </button>
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>From State</th>
                    <th>To State</th>
                    <th>Condition</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {transitions.map((t) => (
                    <tr key={t.id}>
                      <td>
                        <span className="badge bg-info">{t.fromState}</span>
                      </td>
                      <td>
                        <Icon name="arrow-right" className="mx-1" />
                        <span className="badge bg-primary">{t.toState}</span>
                      </td>
                      <td className="text-muted">{t.condition}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-link me-2">
                          <Icon name="edit" />
                        </button>
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={() => handleRemove(t.id)}
                        >
                          <Icon name="remove" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transitions.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-muted text-center">
                        No state transitions configured.
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
