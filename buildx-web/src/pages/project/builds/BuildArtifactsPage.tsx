import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface MockArtifact {
  id: number;
  name: string;
  size: string;
  downloadUrl: string;
}

const MOCK_ARTIFACTS: MockArtifact[] = [
  {
    id: 1,
    name: "buildx-server-linux-amd64",
    size: "24.5 MB",
    downloadUrl: "#",
  },
  {
    id: 2,
    name: "buildx-cli-linux-amd64",
    size: "12.3 MB",
    downloadUrl: "#",
  },
  {
    id: 3,
    name: "buildx-web-dist.tar.gz",
    size: "8.1 MB",
    downloadUrl: "#",
  },
];

const TABS = [
  { id: "dashboard", label: "Dashboard", href: "" },
  { id: "pipeline", label: "Pipeline", href: "/pipeline" },
  { id: "log", label: "Log", href: "/log" },
  { id: "changes", label: "Changes", href: "/changes" },
  { id: "fixed-issues", label: "Fixed Issues", href: "/fixed-issues" },
  { id: "artifacts", label: "Artifacts", href: "/artifacts" },
] as const;

function TabNav({
  activeTab,
  projectPath,
  buildNumber,
}: {
  activeTab: string;
  projectPath: string;
  buildNumber: number;
}) {
  const base = `/${projectPath}/~builds/${buildNumber}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Mirrors OneDev BuildArtifactsPage.
 * Reference: references/onedev/.../web/page/project/builds/detail/BuildArtifactsPage.html
 */
export function BuildArtifactsPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();
  const buildNumber = parseInt(number ?? "0", 10);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${buildNumber} - Artifacts`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Build Info Header */}
          <div className="mb-4">
            <h4 className="mb-0">Build #{buildNumber}</h4>
          </div>

          <TabNav activeTab="artifacts" projectPath={projectPath} buildNumber={buildNumber} />

          {/* Artifact List */}
          {MOCK_ARTIFACTS.map((artifact) => (
            <div key={artifact.id} className="card card-sm mb-3">
              <div className="card-body">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <Icon name="file-document" />
                    <div className="ml-3">
                      <div className="font-weight-bold">{artifact.name}</div>
                      <div className="text-muted font-size-sm">{artifact.size}</div>
                    </div>
                  </div>
                  <a
                    href={artifact.downloadUrl}
                    className="btn btn-outline-secondary btn-sm font-weight-bold"
                    download
                  >
                    <Icon name="download" /> Download
                  </a>
                </div>
              </div>
            </div>
          ))}
          {MOCK_ARTIFACTS.length === 0 && (
            <div className="text-center text-muted py-5">
              No artifacts available
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
