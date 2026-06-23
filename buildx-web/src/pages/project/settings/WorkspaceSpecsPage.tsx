import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { Link } from "react-router-dom";

interface WorkspaceSpec {
  id: string;
  name: string;
  image: string;
  cpu: string;
  memory: string;
}

export default function WorkspaceSpecsPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;

  const [specs, setSpecs] = useState<WorkspaceSpec[]>([
    {
      id: "1",
      name: "default",
      image: "ubuntu:22.04",
      cpu: "2",
      memory: "4Gi",
    },
    {
      id: "2",
      name: "large",
      image: "ubuntu:22.04",
      cpu: "8",
      memory: "16Gi",
    },
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
    setSpecs((prev) => prev.filter((s) => s.id !== id));
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Workspace Specs">
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
                    className={`nav-link ${item.label === "Workspace Specs" ? "active" : ""}`}
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
              <h5 className="card-title mb-0">Workspace Specifications</h5>
              <button className="btn btn-primary btn-sm">
                <Icon name="plus" className="me-1" />
                Add Spec
              </button>
            </div>
            <div className="card-body">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Image</th>
                    <th>CPU</th>
                    <th>Memory</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {specs.map((spec) => (
                    <tr key={spec.id}>
                      <td>
                        <strong>{spec.name}</strong>
                      </td>
                      <td>
                        <code>{spec.image}</code>
                      </td>
                      <td>{spec.cpu} cores</td>
                      <td>{spec.memory}</td>
                      <td className="text-end">
                        <button className="btn btn-sm btn-link me-2">
                          <Icon name="edit" />
                        </button>
                        <button
                          className="btn btn-sm btn-link text-danger"
                          onClick={() => handleRemove(spec.id)}
                        >
                          <Icon name="remove" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {specs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-muted text-center">
                        No workspace specs configured.
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
