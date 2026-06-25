import { useEffect, useState } from "react";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import { Icon } from "../../../components/onedev/Icon";
import {
  type BuildArtifact,
  getBuildArtifacts,
} from "../../../api/builds";
import type { Build } from "../../../api/builds";
import "./build-detail.css";

/**
 * BuildArtifactsPage — lists published build artifacts with download support.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/artifacts/BuildArtifactsPage.html
 */
export function BuildArtifactsPage() {
  const { projectPath, build, loading, error } = useBuildDetail();
  const [artifacts, setArtifacts] = useState<BuildArtifact[]>([]);
  const [artifactsLoading, setArtifactsLoading] = useState(false);
  const [artifactsError, setArtifactsError] = useState<string | null>(null);

  useEffect(() => {
    if (!build) return;
    setArtifactsLoading(true);
    setArtifactsError(null);
    void getBuildArtifacts(build.id)
      .then(setArtifacts)
      .catch((err: unknown) => {
        setArtifactsError(
          err instanceof Error ? err.message : "Failed to load artifacts",
        );
      })
      .finally(() => setArtifactsLoading(false));
  }, [build?.id]);

  const totalSize = artifacts.reduce((sum, a) => sum + a.size, 0);

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="artifacts"
    >
      <div className="build-artifacts">
        {build && (
          <ArtifactsContent
            build={build}
            artifacts={artifacts}
            loading={artifactsLoading}
            error={artifactsError}
            totalSize={totalSize}
          />
        )}
        {!build && !loading && (
          <div className="text-muted py-5 text-center">
            No artifacts available
          </div>
        )}
        {loading && (
          <div className="text-center py-10 text-muted">Loading...</div>
        )}
      </div>
    </BuildDetailLayout>
  );
}

function ArtifactsContent({
  build,
  artifacts,
  loading,
  error,
  totalSize,
}: {
  build: Build;
  artifacts: BuildArtifact[];
  loading: boolean;
  error: string | null;
  totalSize: number;
}) {
  return (
    <div>
      {/* Summary bar */}
      {artifacts.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="text-muted font-size-sm">
            <Icon name="package" className="mr-1" />
            {artifacts.length} artifact{artifacts.length !== 1 ? "s" : ""}
            {totalSize > 0 && (
              <span className="ml-2">({formatBytes(totalSize)})</span>
            )}
          </div>
          <button
            type="button"
            className="btn btn-light btn-hover-primary btn-sm"
            title="Download all as zip"
            disabled
          >
            <Icon name="download" className="mr-1" />
            Download All
          </button>
        </div>
      )}

      {/* Upload button — only available for successful builds */}
      {build.status === "SUCCESSFUL" && (
        <div className="d-flex justify-content-end mb-3">
          <button
            type="button"
            className="btn btn-light btn-hover-primary btn-sm"
            title="Upload artifacts"
            disabled
          >
            <Icon name="upload" />
            <span className="ml-1">Upload Artifacts</span>
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5 text-muted">
          Loading artifacts...
        </div>
      ) : error ? (
        <div className="alert alert-light-danger">{error}</div>
      ) : artifacts.length === 0 ? (
        <div className="text-muted py-5 text-center">
          <div>
            <Icon name="package" />
            <span className="ml-2">
              No artifacts available for this build.
            </span>
          </div>
          <p className="font-size-sm mt-3 mb-0">
            Artifacts can be published by build steps and downloaded from
            this page. They are retained according to the build preservation
            rules configured in project settings.
          </p>
        </div>
      ) : (
        <div className="list-group">
          {artifacts.map((artifact) => (
            <div
              key={artifact.id}
              className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
            >
              <div className="d-flex align-items-center flex-grow-1">
                <Icon
                  name={artifactIcon(artifact.type)}
                  className="mr-3"
                  width={24}
                  height={24}
                />
                <div className="flex-grow-1">
                  <div className="font-weight-bold font-size-sm">
                    {artifact.name}
                  </div>
                  <div className="text-muted font-size-xs">
                    {artifact.path}
                  </div>
                </div>
              </div>
              <div className="d-flex align-items-center ml-3">
                <span className="text-muted font-size-sm mr-3">
                  {formatBytes(artifact.size)}
                </span>
                <button
                  type="button"
                  className="btn btn-light btn-hover-primary btn-icon btn-sm"
                  title="Download"
                  onClick={() => downloadArtifact(build.id, artifact)}
                >
                  <Icon name="download" width={14} height={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function downloadArtifact(buildId: number, artifact: BuildArtifact): void {
  const a = document.createElement("a");
  a.href = `/~api/builds/${buildId}/artifacts/${artifact.id}/download`;
  a.download = artifact.name;
  a.click();
}

function artifactIcon(type: string): string {
  if (type.includes("zip") || type.includes("tar") || type.includes("gzip"))
    return "archive";
  if (type.includes("java-archive") || type.includes("jar"))
    return "java";
  if (type.includes("image") || type.includes("png") || type.includes("jpg"))
    return "image";
  if (type.includes("html") || type.includes("text"))
    return "file-text";
  return "file";
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}
