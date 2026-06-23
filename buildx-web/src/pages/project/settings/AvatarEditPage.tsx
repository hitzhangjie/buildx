import { useRef } from "react";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { Icon } from "../../../components/onedev/Icon";
import { Link } from "react-router-dom";

export default function AvatarEditPage() {
  const { projectPath } = useProject();
  const base = `/${projectPath}/~settings`;
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Avatar">
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
                    className={`nav-link ${item.label === "Avatar" ? "active" : ""}`}
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
            <div className="card-header">
              <h5 className="card-title mb-0">Project Avatar</h5>
            </div>
            <div className="card-body">
              <div className="text-center mb-4">
                <div
                  className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light"
                  style={{ width: 128, height: 128, fontSize: "3rem" }}
                >
                  {"?"}
                </div>
              </div>
              <div className="text-center">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/gif,image/svg+xml"
                  className="d-none"
                />
                <button className="btn btn-primary" onClick={handleUploadClick}>
                  <Icon name="upload" className="me-1" />
                  Upload Avatar
                </button>
                <p className="text-muted mt-2 small">
                  Supported formats: PNG, JPEG, GIF, SVG. Max 1 MB.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
