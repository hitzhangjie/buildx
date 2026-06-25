import { useParams, Link } from "react-router-dom";
import { fetchPacks } from "../../../api/packs";
import { EmptyListState } from "../../../components/global-list/EmptyListState";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { useProject } from "../../../context/ProjectContext";

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = bytes / Math.pow(k, i);
  return `${val.toFixed(i > 0 ? 1 : 0)} ${sizes[i]}`;
}

function formatAge(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days > 1 ? "s" : ""} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months > 1 ? "s" : ""} ago`;
  const years = Math.floor(days / 365);
  return `${years} year${years > 1 ? "s" : ""} ago`;
}

/**
 * BuildPacksPage — packages produced by a specific build.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/pack/BuildPacksPage.html
 * URL pattern: /{project}/~builds/:build/packages/:type
 */
export function BuildPacksPage() {
  const { projectPath } = useProject();
  const { build: buildIdStr, type: packType } = useParams<{
    build: string;
    type: string;
  }>();
  const buildId = parseInt(buildIdStr ?? "0", 10);

  const {
    data: allPacks,
    loading,
    error,
  } = useAsyncResource(fetchPacks, []);

  // Filter by build ID and optionally by type
  const packs = (allPacks ?? []).filter(
    (p) =>
      p.build?.id === buildId &&
      (!packType || p.type.toLowerCase() === packType.toLowerCase()),
  );

  return (
    <div className="card m-2 m-sm-5">
      <div className="card-header">
        <div className="card-title">
          Packages published by Build #{buildId}
          {packType && (
            <span className="text-muted ml-1">({packType})</span>
          )}
        </div>
      </div>
      <div className="card-body p-0">
        {loading && (
          <div className="p-3 text-muted">Loading packages...</div>
        )}
        {error && (
          <div className="p-3">
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          </div>
        )}
        {!loading && !error && !packs.length && (
          <div className="p-3">
            <EmptyListState message="No packages for this build" />
          </div>
        )}
        {!loading && !error && packs.length > 0 && (
          <table className="table table-hover mb-0">
            <thead>
              <tr>
                <th className="pack">Package</th>
                <th className="type d-none d-lg-table-cell">Type</th>
                <th className="date d-none d-lg-table-cell">
                  Last Published
                </th>
                <th className="size d-none d-lg-table-cell">Total Size</th>
              </tr>
            </thead>
            <tbody>
              {packs.map((pack) => (
                <tr key={pack.id}>
                  <td className="pack">
                    <Link
                      to={`/${projectPath}/~packages/${pack.id}`}
                      className="text-nowrap mr-2"
                    >
                      <img
                        src="/~icon/package.svg"
                        alt=""
                        className="icon mr-1"
                        width={16}
                        height={16}
                      />
                      <span>{pack.reference}</span>
                    </Link>
                    <span>
                      {pack.labels.map((l) => (
                        <span
                          key={l.id}
                          className="badge badge-light mr-1"
                        >
                          {l.name}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="type d-none d-lg-table-cell">
                    {pack.type}
                  </td>
                  <td className="date d-none d-lg-table-cell text-muted">
                    {formatAge(pack.publishDate)}
                  </td>
                  <td className="size d-none d-lg-table-cell text-muted">
                    {formatBytes(pack.size)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
