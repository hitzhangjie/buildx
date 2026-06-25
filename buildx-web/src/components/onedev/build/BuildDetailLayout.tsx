import { type ReactNode, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { setBuildDescription } from "../../../api/builds";
import { BuildStatusIcon, buildStatusLabel } from "../build/BuildStatusIcon";
import { Icon } from "../Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { formatBuildDate, formatDuration, formatRefName } from "../../../util/build";

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
  /** Called after description is saved (so parent can refresh the build) */
  onBuildUpdate?: (build: Build) => void;
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
  onBuildUpdate,
}: BuildDetailLayoutProps) {
  const [sideVisible, setSideVisible] = useState(false);

  const pageTitle = build ? `Build #${build.number}` : "Build";
  const isFinished = build
    ? ["SUCCESSFUL", "FAILED", "CANCELLED", "TIMED_OUT"].includes(build.status)
    : false;
  const isRunning = build
    ? ["WAITING", "PENDING", "RUNNING"].includes(build.status)
    : false;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="build-detail d-flex flex-column card m-2 m-sm-5 flex-grow-1">
        {/* ---- card header: matches OneDev BuildDetailPage.html ---- */}
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
                {/* ---- action buttons ---- */}
                <div className="actions mr-2 d-inline-flex align-items-center">
                  {isFinished && (
                    <button
                      type="button"
                      className="btn btn-icon btn-light btn-hover-primary btn-xs mr-1"
                      title="Re-run this build"
                      disabled
                    >
                      <Icon name="re-run" />
                    </button>
                  )}
                  {isRunning && (
                    <button
                      type="button"
                      className="btn btn-icon btn-light btn-hover-danger btn-xs mr-1"
                      title="Cancel this build"
                      disabled
                    >
                      <Icon name="cancel" />
                    </button>
                  )}
                  {isFinished && (
                    <button
                      type="button"
                      className="btn btn-icon btn-light btn-hover-primary btn-xs mr-1"
                      title="Set description"
                      disabled
                    >
                      <Icon name="info" />
                    </button>
                  )}
                  {build.status === "SUCCESSFUL" && (
                    <button
                      type="button"
                      className="btn btn-icon btn-light btn-hover-primary btn-xs mr-1"
                      title="Upload artifacts"
                      disabled
                    >
                      <Icon name="upload" />
                    </button>
                  )}
                </div>
              </>
            ) : loading ? (
              <span className="text-muted">Loading…</span>
            ) : (
              <span className="text-muted">Build not found</span>
            )}
          </div>
          {/* ---- more-info toggle ---- */}
          <div className="card-toolbar">
            <button
              type="button"
              className="more-info side-info ml-auto btn btn-icon btn-light btn-xs"
              title="More info"
              onClick={() => setSideVisible((v) => !v)}
            >
              <Icon name="ellipsis" />
            </button>
          </div>
        </div>

        {/* ---- card body ---- */}
        <div className="card-body d-flex flex-grow-1 position-relative">
          <div className="main flex-grow-1 d-flex flex-column">
            {error && (
              <div className="alert alert-light-danger mb-3" role="alert">
                {error}
              </div>
            )}
            {build && (
              <BuildDescriptionEditor
                build={build}
                onSaved={onBuildUpdate ?? (() => {})}
              />
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
          {/* ---- more-info side panel ---- */}
          {build && sideVisible && (
            <div
              className="more-info side-info d-block ml-5"
              style={{ minWidth: 260, maxWidth: 320, width: 320 }}
            >
              <BuildSideInfo
                build={build}
                projectPath={projectPath}
              />
            </div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}

/** Build description editor (inline) */
function BuildDescriptionEditor({
  build,
  onSaved,
}: {
  build: Build;
  onSaved: (build: Build) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(build.description ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await setBuildDescription(build.id, text);
      onSaved({ ...build, description: text });
      setEditing(false);
    } catch {
      // keep editor open on error
    } finally {
      setSaving(false);
    }
  }, [build, text, onSaved]);

  if (!editing) {
    return (
      <div
        className="description border border-dashed border-primary rounded p-3 mb-3"
        style={{ cursor: "pointer" }}
        onClick={() => setEditing(true)}
        title="Click to edit description"
      >
        {build.description || (
          <span className="text-muted">Click to add description…</span>
        )}
      </div>
    );
  }

  return (
    <div className="border border-dashed border-primary rounded p-3 mb-3">
      <textarea
        className="form-control mb-2"
        rows={4}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Build description (Markdown supported)"
      />
      <div className="d-flex gap-2">
        <button
          type="button"
          className="btn btn-primary btn-xs"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-xs"
          onClick={() => {
            setText(build.description ?? "");
            setEditing(false);
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Build-side info panel matching OneDev BuildSidePanel.html DOM structure.
 * Reference: references/onedev/.../web/component/build/side/BuildSidePanel.html
 */
function BuildSideInfo({
  build,
  projectPath,
}: {
  build: Build;
  projectPath: string;
}) {
  const branch = formatRefName(build.refName);
  const isTag = build.refName?.startsWith("refs/tags/");
  const refLabel = isTag
    ? build.refName.replace("refs/tags/", "")
    : branch;
  const isCancelled = build.status === "CANCELLED";
  const hasPending =
    build.pendingDate && build.pendingDuration !== undefined && build.pendingDuration > 0;
  const hasRunning =
    build.runningDate && build.runningDuration !== undefined && build.runningDuration > 0;

  return (
    <div className="build-side font-size-sm">
      {/* ---- General properties ---- */}
      <div className="general properties">
        {/* Commit */}
        <div>
          <div className="name">Commit</div>
          <div className="value">
            {build.commitHash ? (
              <Link to={`/${projectPath}/~commits/${build.commitHash}`}>
                {build.commitHash.slice(0, 8)}
              </Link>
            ) : (
              <span className="text-muted">—</span>
            )}
          </div>
        </div>
        {/* Branch or Tag */}
        {refLabel && (
          <div>
            <div className="name">{isTag ? "Tag" : "Branch"}</div>
            <div className="value">
              <Link
                to={`/${projectPath}/~files/${isTag ? "tags" : "heads"}/${refLabel}`}
              >
                <Icon name={isTag ? "tag" : "branch"} />
                <span className="ml-1">{refLabel}</span>
              </Link>
            </div>
          </div>
        )}
        {/* Job */}
        <div>
          <div className="name">Job</div>
          <div className="value">
            <span>{build.jobName}</span>
          </div>
        </div>
        {/* Submitted By */}
        {build.submitter && (
          <div>
            <div className="name">Submitted By</div>
            <div className="value">
              <span>{build.submitter.fullName || build.submitter.name}</span>
            </div>
          </div>
        )}
        {/* Submitted At */}
        <div>
          <div className="name">Submitted At</div>
          <div className="value">
            <span>{formatBuildDate(build.submitDate)}</span>
          </div>
        </div>
        {/* Submit Reason */}
        {build.submitReason && (
          <div>
            <div className="name">Submit Reason</div>
            <div className="value">
              <span>{build.submitReason}</span>
            </div>
          </div>
        )}
        {/* Queueing Takes */}
        {hasPending && (
          <div>
            <div className="name">Queueing Takes</div>
            <div className="value">
              <span>{formatDuration(build.pendingDuration ?? 0)}</span>
            </div>
          </div>
        )}
        {/* Running Takes */}
        {hasRunning && (
          <div>
            <div className="name">Running Takes</div>
            <div className="value">
              <span>{formatDuration(build.runningDuration ?? 0)}</span>
            </div>
          </div>
        )}
        {/* Cancelled By */}
        {isCancelled && build.canceller && (
          <div>
            <div className="name">Cancelled By</div>
            <div className="value">
              <span>{build.canceller.fullName || build.canceller.name}</span>
            </div>
          </div>
        )}
      </div>

      {/* ---- Labels ---- */}
      <div className="labels">
        <div className="head d-flex align-items-center justify-content-between">
          <span>Labels</span>
          <Icon name="gear" className="icon-sm" />
        </div>
        <div className="body d-flex align-items-center flex-wrap gap-1">
          {/* TODO: fetch and display build labels */}
          <span className="text-muted font-size-xs">—</span>
        </div>
      </div>

      {/* ---- Params ---- */}
      {/* TODO: fetch and display build params */}

      {/* ---- Dependences ---- */}
      {/* TODO: fetch and display dependencies / dependents */}

      {/* ---- Delete ---- */}
      <div className="actions">
        <button type="button" className="delete btn btn-light-danger" disabled>
          Delete
        </button>
      </div>
    </div>
  );
}
