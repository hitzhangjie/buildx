import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { PackSidePanel } from "../../../components/onedev/panels/PackSidePanel";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { fetchPack, type Pack, type PackLabel } from "../../../api/packs";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import "./pack-detail.css";

/**
 * PackDetailPage — individual package detail page.
 * Reference: references/onedev/.../web/page/project/packs/detail/PackDetailPage.html
 */
export function PackDetailPage() {
  const { projectPath } = useProject();
  const { pack: packIdStr } = useParams<{ pack: string }>();
  const packId = parseInt(packIdStr ?? "0", 10);
  const [showSidebar, setShowSidebar] = useState(true);
  const [deleted, setDeleted] = useState(false);

  const {
    data: pack,
    loading,
    error,
  } = useAsyncResource<Pack | null>(
    () => fetchPack(packId),
    [packId],
  );

  const handleLabelsChanged = useCallback((_labels: PackLabel[]) => {
    // Labels are managed within PackSidePanel's local state; callback preserved for future server sync.
  }, []);

  const handleDeleted = useCallback(() => {
    setDeleted(true);
  }, []);

  // Deleted redirect
  if (deleted) {
    return (
      <ProjectLayout projectPath={projectPath} pageTitle="Package deleted">
        <div className="text-center py-5 text-muted">
          <h5>Package deleted</h5>
          <p>
            <Link to={`/${projectPath}/~packages`} className="btn btn-outline-secondary btn-sm">
              Back to packages
            </Link>
          </p>
        </div>
      </ProjectLayout>
    );
  }

  const pageTitle = pack
    ? `[${projectPath}] ${pack.type} ${pack.reference}`
    : `Package #${packId}`;

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={pageTitle}>
      <div className="pack-detail d-flex flex-column card m-2 m-sm-5 flex-grow-1">
        {/* Header */}
        <div className="card-header flex-shrink-0 flex-nowrap d-flex align-items-center">
          <div className="card-title flex-wrap d-flex align-items-center">
            {loading && (
              <span className="text-muted">Loading package...</span>
            )}
            {error && (
              <span className="text-danger">Error: {error}</span>
            )}
            {!pack && !loading && !error && (
              <span className="text-muted">Package not found</span>
            )}
            {pack && (
              <>
                <span className="font-weight-bold">{pack.reference}</span>
                <span className="text-muted ml-1">({pack.type})</span>
              </>
            )}
          </div>
          {pack && (
            <div className="card-toolbar">
              <a
                className="more-info side-info ml-auto"
                title={showSidebar ? "Hide side info" : "More info"}
                role="button"
                tabIndex={0}
                onClick={() => setShowSidebar((v) => !v)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setShowSidebar((v) => !v);
                }}
              >
                <Icon name="ellipsis" className="icon" />
              </a>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="card-body d-flex flex-grow-1 position-relative">
          {!loading && !error && !pack && (
            <div className="flex-grow-1 text-center py-5 text-muted">
              <h5>Package #{packId} not found</h5>
              <p>
                <Link
                  to={`/${projectPath}/~packages`}
                  className="btn btn-outline-secondary btn-sm"
                >
                  Back to packages
                </Link>
              </p>
            </div>
          )}

          {pack && (
            <>
              {/* Main content area — type-specific detail */}
              <div className="main flex-grow-1 d-flex flex-column">
                <div className="pack-content p-3">
                  <h5 className="mb-3">Package Details</h5>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted pr-3" style={{ width: "30%" }}>
                          Type
                        </td>
                        <td>{pack.type}</td>
                      </tr>
                      <tr>
                        <td className="text-muted pr-3">Name</td>
                        <td>{pack.name}</td>
                      </tr>
                      <tr>
                        <td className="text-muted pr-3">Version</td>
                        <td>
                          {pack.version}
                          {pack.prerelease && (
                            <span className="badge badge-warning ml-1">
                              pre-release
                            </span>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted pr-3">Project</td>
                        <td>
                          <Link to={`/${pack.projectPath}`}>
                            {pack.projectPath}
                          </Link>
                        </td>
                      </tr>
                      {pack.build && (
                        <tr>
                          <td className="text-muted pr-3">Build</td>
                          <td>
                            <Link
                              to={`/${pack.projectPath}/~builds/${pack.build.id}`}
                            >
                              Build #{pack.build.buildNumber ?? pack.build.id}
                            </Link>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Blobs table */}
                  {pack.blobs && pack.blobs.length > 0 && (
                    <>
                      <h6 className="mt-4 mb-3">Blobs</h6>
                      <table className="table table-sm table-hover">
                        <thead>
                          <tr>
                            <th>SHA256</th>
                            <th>Size</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pack.blobs.map((blob) => (
                            <tr key={blob.id}>
                              <td className="text-monospace font-size-sm">
                                {blob.sha256Hash}
                              </td>
                              <td>
                                {blob.size > 1024 * 1024
                                  ? `${(blob.size / (1024 * 1024)).toFixed(1)} MB`
                                  : blob.size > 1024
                                    ? `${(blob.size / 1024).toFixed(1)} KB`
                                    : `${blob.size} B`}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}

                  {(!pack.blobs || pack.blobs.length === 0) && (
                    <p className="text-muted font-size-sm mt-4">
                      No blobs available. Publish instructions will be available
                      once the package type handler is implemented.
                    </p>
                  )}
                </div>
              </div>

              {/* Side info panel */}
              {showSidebar && (
                <PackSidePanel
                  pack={pack}
                  canWrite={false}
                  onDeleted={handleDeleted}
                  onLabelsChanged={handleLabelsChanged}
                />
              )}
            </>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
