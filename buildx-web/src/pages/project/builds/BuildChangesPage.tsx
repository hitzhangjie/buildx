import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import { Icon } from "../../../components/onedev/Icon";
import {
  type BuildChange,
  getBuildChanges,
} from "../../../api/builds";
import { formatRefName } from "../../../util/build";
import type { Build } from "../../../api/builds";
import "./build-detail.css";

/**
 * BuildChangesPage — shows commits and file changes between this build and
 * the previous successful build.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/changes/BuildChangesPage.html
 */
export function BuildChangesPage() {
  const { projectPath, build, loading, error } = useBuildDetail();
  const [changes, setChanges] = useState<BuildChange[]>([]);
  const [changesLoading, setChangesLoading] = useState(false);
  const [changesError, setChangesError] = useState<string | null>(null);

  useEffect(() => {
    if (!build) return;
    setChangesLoading(true);
    setChangesError(null);
    void getBuildChanges(build.id)
      .then(setChanges)
      .catch((err: unknown) => {
        setChangesError(
          err instanceof Error ? err.message : "Failed to load changes",
        );
      })
      .finally(() => setChangesLoading(false));
  }, [build?.id]);

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="changes"
    >
      <div className="build-changes">
        {build && (
          <ChangesContent
            build={build}
            projectPath={projectPath}
            changes={changes}
            loading={changesLoading}
            error={changesError}
          />
        )}
        {!build && !loading && (
          <div className="text-muted py-5 text-center">
            No file changes
          </div>
        )}
        {loading && (
          <div className="text-center py-10 text-muted">Loading...</div>
        )}
      </div>
    </BuildDetailLayout>
  );
}

function ChangesContent({
  build,
  projectPath,
  changes,
  loading,
  error,
}: {
  build: Build;
  projectPath: string;
  changes: BuildChange[];
  loading: boolean;
  error: string | null;
}) {
  const refLabel = formatRefName(build.refName);
  const isTag = build.refName?.startsWith("refs/tags/");
  const refType = isTag ? "tags" : "heads";

  return (
    <div>
      {/* Build context summary */}
      <div className="border rounded p-3 mb-4 bg-light">
        <div className="font-weight-bolder mb-2">Build Context</div>
        <table className="table table-sm mb-0" style={{ maxWidth: 500 }}>
          <tbody>
            <tr>
              <td className="text-muted border-0" style={{ width: 100 }}>
                {isTag ? "Tag" : "Branch"}
              </td>
              <td className="border-0">
                <Icon name={isTag ? "tag" : "branch"} />
                <Link
                  to={`/${projectPath}/~files/${refType}/${refLabel}`}
                  className="ml-1"
                >
                  {refLabel}
                </Link>
              </td>
            </tr>
            <tr>
              <td className="text-muted border-0">Commit</td>
              <td className="border-0">
                <Icon name="commit" />
                <Link
                  to={`/${projectPath}/~commits/${build.commitHash}`}
                  className="ml-1"
                >
                  {build.commitHash}
                </Link>
              </td>
            </tr>
            <tr>
              <td className="text-muted border-0">Job</td>
              <td className="border-0">{build.jobName}</td>
            </tr>
            {build.version && (
              <tr>
                <td className="text-muted border-0">Version</td>
                <td className="border-0">{build.version}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Changes */}
      {loading ? (
        <div className="text-center py-5 text-muted">
          Loading changes...
        </div>
      ) : error ? (
        <div className="alert alert-light-danger">{error}</div>
      ) : changes.length === 0 ? (
        <div className="border rounded p-4 text-center">
          <div className="text-muted mb-3">
            <Icon name="file-diff" />
            <span className="ml-2">
              No changes found. This may be the first build on this ref
              stream, or the commit range is empty.
            </span>
          </div>
        </div>
      ) : (
        <div className="changes-list">
          {changes.map((change, idx) => (
            <div
              key={change.commitHash}
              className={`card mb-3 ${idx === 0 ? "" : ""}`}
            >
              <div className="card-header d-flex justify-content-between align-items-center py-2">
                <div className="d-flex align-items-center">
                  <Icon name="commit" className="mr-2" />
                  <Link
                    to={`/${projectPath}/~commits/${change.commitHash}`}
                    className="font-weight-bold font-size-sm mr-3"
                  >
                    {change.commitHash.slice(0, 8)}
                  </Link>
                  <span className="font-size-sm text-truncate" style={{ maxWidth: 400 }}>
                    {change.message.split("\n")[0]}
                  </span>
                </div>
                <div className="d-flex align-items-center font-size-sm text-muted">
                  <Icon name="user" className="mr-1" width={12} height={12} />
                  <span className="mr-3">{change.author}</span>
                  <span>{new Date(change.authorDate).toLocaleString()}</span>
                </div>
              </div>
              <div className="card-body p-0">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Type</th>
                      <th>Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {change.files.map((file, fi) => (
                      <tr key={fi}>
                        <td>
                          <FileTypeBadge type={file.type} />
                        </td>
                        <td>
                          <Link
                            to={`/${projectPath}/~blob/${change.commitHash}/${file.path}`}
                            className="font-size-sm"
                          >
                            {file.type === "deleted" ? (
                              <span className="text-muted">
                                <del>{file.path}</del>
                              </span>
                            ) : (
                              file.path
                            )}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FileTypeBadge({
  type,
}: {
  type: "added" | "modified" | "deleted" | "renamed";
}) {
  const map: Record<string, { label: string; class: string }> = {
    added: { label: "A", class: "badge-success" },
    modified: { label: "M", class: "badge-warning" },
    deleted: { label: "D", class: "badge-danger" },
    renamed: { label: "R", class: "badge-info" },
  };
  const m = map[type] ?? { label: "?", class: "badge-secondary" };
  return <span className={`badge ${m.class}`}>{m.label}</span>;
}
