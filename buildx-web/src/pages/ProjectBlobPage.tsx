import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchBlob, type BlobContent, type BlobEntry } from "../api/blob";
import { useProjectContext } from "../context/ProjectContext";
import { ProjectLayout } from "../layout/ProjectLayout";
import { getMockReadme } from "../mocks/fixtures/blob";
import { USE_MOCK } from "../mocks/config";
import { blobUrl, fileIcon, parentBlobUrl, parseBlobSegments } from "../util/blobPath";

function BlobNavigator({
  projectPath,
  revision,
  path,
}: {
  projectPath: string;
  revision: string;
  path: string;
}) {
  const parts = path ? path.split("/") : [];

  return (
    <div className="blob-navigator d-flex align-items-center flex-wrap">
      <Link to={blobUrl(projectPath, revision, "")} className="mr-1">
        {projectPath.split("/").pop()}
      </Link>
      {parts.map((part, index) => {
        const subPath = parts.slice(0, index + 1).join("/");
        const isLast = index === parts.length - 1;
        return (
          <span key={subPath} className="d-inline-flex align-items-center">
            <span className="text-muted mx-1">/</span>
            {isLast ? (
              <span>{part}</span>
            ) : (
              <Link to={blobUrl(projectPath, revision, subPath)}>{part}</Link>
            )}
          </span>
        );
      })}
    </div>
  );
}

function FolderRow({
  projectPath,
  revision,
  entry,
}: {
  projectPath: string;
  revision: string;
  entry: BlobEntry;
}) {
  return (
    <tr className="child">
      <td className="path text-break">
        <Link to={blobUrl(projectPath, revision, entry.path)}>
          <img
            src={`/~icon/${fileIcon(entry.name, entry.type)}.svg`}
            alt=""
            className="icon mr-1"
            width={16}
            height={16}
          />
          <span>{entry.name}</span>
        </Link>
      </td>
      <td className="last-commit author text-muted font-size-sm">
        {entry.lastCommit?.author}
      </td>
      <td className="last-commit message d-none d-lg-table-cell text-muted font-size-sm">
        {entry.lastCommit?.message}
      </td>
      <td className="last-commit when text-gray d-none d-xl-table-cell font-size-sm">
        {entry.lastCommit?.when}
      </td>
    </tr>
  );
}

function FolderView({
  projectPath,
  revision,
  path,
  blob,
}: {
  projectPath: string;
  revision: string;
  path: string;
  blob: BlobContent;
}) {
  const parent = parentBlobUrl(projectPath, revision, path);
  const readme = USE_MOCK && path === "" ? getMockReadme("") : null;

  return (
    <div className="folder-view">
      <table className="files table">
        <tbody>
          {parent && (
            <tr className="parent">
              <td colSpan={4}>
                <Link to={parent}>
                  <img src="/~icon/level-up.svg" alt="" className="icon mr-1" width={16} height={16} />
                  <span>..</span>
                </Link>
              </td>
            </tr>
          )}
          {(blob.entries ?? []).map((entry) => (
            <FolderRow
              key={entry.path}
              projectPath={projectPath}
              revision={revision}
              entry={entry}
            />
          ))}
        </tbody>
      </table>
      {readme && (
        <div className="readme">
          <div className="head px-4 pt-4">
            <b className="title mr-2">{readme.title}</b>
          </div>
          <pre className="body p-4 mb-0 font-size-sm">{readme.content}</pre>
        </div>
      )}
    </div>
  );
}

function FileView({ blob }: { blob: BlobContent }) {
  return (
    <>
      <div className="border-bottom d-flex align-items-center px-3 py-2 justify-content-between">
        <span className="text-gray font-size-sm">
          {blob.size !== undefined ? `${blob.size} bytes` : ""}
        </span>
        <span>
          <a
            href="#"
            className="btn btn-icon btn-xs btn-light btn-hover-primary ml-4"
            title="Download"
            onClick={(e) => e.preventDefault()}
          >
            <img src="/~icon/download.svg" alt="" className="icon" width={14} height={14} />
          </a>
        </span>
      </div>
      <pre className="p-4 mb-0 font-size-sm blob-file-content">{blob.content}</pre>
    </>
  );
}

export function ProjectBlobPage() {
  const { projectPath, blobSegments } = useProjectContext();
  const { revision, path } = parseBlobSegments(blobSegments ?? []);
  const [blob, setBlob] = useState<BlobContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath) {
      return;
    }
    const pathForFetch = projectPath;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBlob(pathForFetch, revision, path);
        if (!cancelled) {
          setBlob(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError((err as { message?: string }).message ?? "Failed to load files");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [projectPath, revision, path]);

  if (!projectPath) {
    return null;
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Files">
      <div className="project-blob flex-grow-1 d-flex flex-column">
        <div className="head d-flex align-items-center justify-content-between flex-wrap px-3 flex-shrink-0">
          <div className="d-flex flex-wrap align-items-center">
            <span className="revision-picker mr-3 py-2 btn btn-sm btn-light">
              <img src="/~icon/branch.svg" alt="" className="icon mr-1" width={14} height={14} />
              {revision}
            </span>
            <BlobNavigator projectPath={projectPath} revision={revision} path={path} />
          </div>
          <div className="blob-operations py-2">
            <a
              href="#"
              className="mr-4 font-weight-boldest font-size-lg text-nowrap link-info"
              onClick={(e) => e.preventDefault()}
            >
              <img src="/~icon/download2.svg" alt="" className="icon mr-1" width={16} height={16} />
              Clone
            </a>
            <a href="#" className="mr-3 text-nowrap" onClick={(e) => e.preventDefault()}>
              Add
            </a>
            <a href="#" className="mr-3 text-nowrap" onClick={(e) => e.preventDefault()}>
              Search
            </a>
            <Link
              to={`/${projectPath}/~commits`}
              className="text-nowrap"
            >
              History
            </Link>
          </div>
        </div>

        <div className="blob-content autofit flex-grow-1 d-flex flex-column overflow-auto">
          {error && <div className="alert alert-light-danger m-3">{error}</div>}
          {loading ? (
            <div className="text-center py-10 text-muted">Loading…</div>
          ) : !blob ? (
            <div className="text-center py-10 text-muted">Path not found</div>
          ) : blob.type === "directory" ? (
            <FolderView projectPath={projectPath} revision={revision} path={path} blob={blob} />
          ) : (
            <FileView blob={blob} />
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
