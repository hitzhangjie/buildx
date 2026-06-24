import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { BuildStatusIcon, buildStatusLabel } from "../build/BuildStatusIcon";
import { Icon } from "../Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { formatRefName } from "../../../util/build";

export type BuildDetailTab = {
  id: string;
  label: string;
  href: string;
  disabled?: boolean;
};

type BuildDetailLayoutProps = {
  projectPath: string;
  build: Build | null;
  loading?: boolean;
  error?: string | null;
  activeTab: string;
  children: ReactNode;
};

function buildTabs(projectPath: string, buildNumber: number): BuildDetailTab[] {
  const base = `/${projectPath}/~builds/${buildNumber}`;
  return [
    { id: "log", label: "Log", href: `${base}/log` },
    { id: "pipeline", label: "Pipeline", href: `${base}/pipeline` },
    { id: "changes", label: "Code Changes", href: `${base}/changes` },
    { id: "fixed-issues", label: "Fixed Issues", href: `${base}/fixed-issues` },
    { id: "artifacts", label: "Artifacts", href: `${base}/artifacts` },
  ];
}

export function BuildDetailLayout({
  projectPath,
  build,
  loading,
  error,
  activeTab,
  children,
}: BuildDetailLayoutProps) {
  const pageTitle = build ? `Build #${build.number}` : "Build";

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="build-detail d-flex flex-column card m-2 m-sm-5 flex-grow-1">
        <div className="card-header flex-shrink-0 flex-nowrap">
          <div className="card-title flex-wrap">
            {build ? (
              <>
                <span className="text-break">{build.jobName}</span>
                <span className="number ml-2 mr-4 text-muted">#{build.number}</span>
                <div className="status text-nowrap mr-4 d-inline-flex align-items-center">
                  <BuildStatusIcon status={build.status} className="mr-2" />
                  <span>{buildStatusLabel(build.status)}</span>
                </div>
              </>
            ) : loading ? (
              <span className="text-muted">Loading…</span>
            ) : (
              <span className="text-muted">Build not found</span>
            )}
          </div>
        </div>
        <div className="card-body d-flex flex-grow-1 position-relative">
          <div className="main flex-grow-1 d-flex flex-column">
            {error && (
              <div className="alert alert-light-danger mb-3" role="alert">
                {error}
              </div>
            )}
            {build?.description && (
              <div className="border border-dashed border-primary rounded p-3 mb-3">
                {build.description}
              </div>
            )}
            {build && (
              <ul className="tabs nav nav-tabs nav-tabs-line nav-bold mb-5 flex-shrink-0">
                {buildTabs(projectPath, build.number).map((tab) => (
                  <li key={tab.id} className="nav-item">
                    {tab.disabled ? (
                      <span className="nav-link disabled">{tab.label}</span>
                    ) : (
                      <Link
                        to={tab.href}
                        className={`nav-link ${activeTab === tab.id ? "active" : ""}`}
                      >
                        {tab.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {children}
          </div>
          {build && (
            <div className="more-info side-info d-none d-xl-block ml-5" style={{ minWidth: 240 }}>
              <BuildSideInfo build={build} projectPath={projectPath} />
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}

function BuildSideInfo({ build, projectPath }: { build: Build; projectPath: string }) {
  const branch = formatRefName(build.refName);
  return (
    <div className="build-side font-size-sm">
      {build.submitter && (
        <div className="mb-3">
          <div className="text-muted mb-1">Submitted by</div>
          <div>{build.submitter.fullName || build.submitter.name}</div>
        </div>
      )}
      {branch && (
        <div className="mb-3">
          <div className="text-muted mb-1">Branch</div>
          <div className="d-flex align-items-center">
            <Icon name="branch" />
            <span className="ml-1">{branch}</span>
          </div>
        </div>
      )}
      {build.commitHash && (
        <div className="mb-3">
          <div className="text-muted mb-1">Commit</div>
          <Link to={`/${projectPath}/~commits/${build.commitHash}`}>
            {build.commitHash.slice(0, 8)}
          </Link>
        </div>
      )}
      <div className="mb-3">
        <div className="text-muted mb-1">Job</div>
        <div>{build.jobName}</div>
      </div>
    </div>
  );
}
