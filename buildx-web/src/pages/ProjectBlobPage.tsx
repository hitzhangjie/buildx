import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchBlob, createFile, type BlobContent, type BlobEntry } from "../api/blob";
import { NoCommitsPanel } from "../components/onedev/panels/NoCommitsPanel";
import { useProjectContext } from "../context/ProjectContext";
import { ProjectLayout } from "../layout/ProjectLayout";
import { getMockReadme } from "../mocks/fixtures/blob";
import { USE_MOCK } from "../mocks/config";
import {
  blobUrl,
  parentBlobUrl,
  parseBlobSegments,
  fileIcon,
  type BlobMode,
} from "../util/blobPath";
import { BlobAddEditPanel } from "./project/blob/BlobAddEditPanel";
import { NoNameEditPanel } from "./project/blob/NoNameEditPanel";

// ---------------------------------------------------------------------------
// BlobNavigator – breadcrumb with optional inline file-name input
// ---------------------------------------------------------------------------

function BlobNavigator({
  projectPath,
  revision,
  path,
  mode,
  newFileName,
  onNewFileNameChange,
}: {
  projectPath: string;
  revision: string;
  path: string;
  mode?: BlobMode;
  newFileName?: string;
  onNewFileNameChange?: (name: string) => void;
}) {
  const parts = path ? path.split("/") : [];
  const isEditing = mode === "add" || mode === "edit";

  return (
    <div className="blob-navigator d-flex align-items-center flex-wrap">
      <Link to={blobUrl(projectPath, revision, "")} className="mr-1">
        {projectPath.split("/").pop()}
      </Link>
      {parts.map((part, index) => {
        const subPath = parts.slice(0, index + 1).join("/");
        return (
          <span key={subPath} className="d-inline-flex align-items-center">
            <span className="text-muted mx-1">/</span>
            <Link to={blobUrl(projectPath, revision, subPath)}>{part}</Link>
          </span>
        );
      })}
      {isEditing ? (
        <span className="d-inline-flex align-items-center">
          <span className="text-muted mx-1">/</span>
          <span className="last-segment">
            <form
              className="leave-confirm name"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="text"
                className="form-control form-control-sm form-control-solid"
                placeholder="Name your file"
                value={newFileName ?? ""}
                onChange={(e) => onNewFileNameChange?.(e.target.value)}
                autoFocus={mode === "add"}
              />
            </form>
          </span>
        </span>
      ) : path ? (
        <span className="d-inline-flex align-items-center">
          <span className="text-muted mx-1">/</span>
          <span>{parts[parts.length - 1]}</span>
        </span>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// FolderRow
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FolderView
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// FileView
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// InlineDropdown — used for the "Add" button dropdown
// ---------------------------------------------------------------------------

function InlineDropdown({
  isOpen,
  onClose,
  triggerRef,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose, triggerRef]);

  if (!isOpen) return null;

  return (
    <div ref={menuRef} className="floating dropdown-menu show" style={{ position: "absolute", zIndex: 1050 }}>
      <div className="dropdown-menu-content">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProjectBlobPage
// ---------------------------------------------------------------------------

export function ProjectBlobPage() {
  const { projectPath, blobSegments } = useProjectContext();
  const { revision, path } = parseBlobSegments(blobSegments ?? []);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Parse mode and extra params from URL
  const mode: BlobMode = (searchParams.get("mode") as BlobMode) || "view";
  const initialPath = searchParams.get("initialPath") || undefined;

  // Blob data state
  const [blob, setBlob] = useState<BlobContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ADD/EDIT mode state
  const [newFileName, setNewFileName] = useState(initialPath ?? "");
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const addTriggerRef = useRef<HTMLAnchorElement>(null);

  // Support ?empty=1 to preview the empty-project guidance
  const forceEmpty = searchParams.get("empty") === "1";

  // Compute effective new path (directory + file name)
  const newFilePath = newFileName ? (path ? `${path}/${newFileName}` : newFileName) : "";

  useEffect(() => {
    if (!projectPath || forceEmpty) {
      return;
    }
    const pp = projectPath; // narrowed to string
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchBlob(pp, revision, path);
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
  }, [projectPath, revision, path, forceEmpty]);

  // Clear edit state when mode changes to view
  useEffect(() => {
    if (mode === "view") {
      setNewFileName("");
    }
  }, [mode]);

  // Enter ADD mode in the given directory
  const enterAddMode = useCallback((newFilePath?: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", "add");
    if (newFilePath) {
      params.set("initialPath", newFilePath);
    }
    setSearchParams(params, { replace: false });
    setNewFileName(newFilePath ?? "");
  }, [searchParams, setSearchParams]);

  // Handle commit from BlobAddEditPanel
  const handleCommit = useCallback(async (commitMessage: string, content: string) => {
    const filePath = newFilePath;
    if (!filePath) return;

    try {
      await createFile(projectPath!, revision, filePath, content, commitMessage);
      // Navigate to the newly created file in view mode
      navigate(blobUrl(projectPath!, revision, filePath), { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to create file");
    }
  }, [projectPath, revision, newFilePath, navigate]);

  // Handle cancel from edit panels — go back to VIEW mode
  const handleCancelEdit = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.delete("mode");
    params.delete("initialPath");
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  if (!projectPath) {
    return null;
  }

  // --- Determine what to render in the content area ---

  const isEditMode = mode === "add" || mode === "edit";
  const isEmpty = forceEmpty || (!loading && !error && !blob);

  let content: React.ReactNode;

  if (isEditMode) {
    // ADD or EDIT mode override the normal view
    if (mode === "add" && !newFileName) {
      // No file name entered yet — show prompt
      content = (
        <>
          <NoNameEditPanel />
          {/* Also show the folder view beneath so user can see where they are */}
          {blob && blob.type === "directory" && !isEmpty && (
            <FolderView projectPath={projectPath} revision={revision} path={path} blob={blob} />
          )}
        </>
      );
    } else if (mode === "add" || mode === "edit") {
      // File name entered — show editor
      const existingContent = mode === "edit" && blob?.type === "file" ? (blob.content ?? "") : "";
      content = (
        <BlobAddEditPanel
          filePath={newFilePath}
          initialContent={existingContent}
          revision={revision}
          onCancel={handleCancelEdit}
          onCommit={handleCommit}
        />
      );
    }
  } else if (isEmpty && path === "") {
    content = <NoCommitsPanel projectPath={projectPath} />;
  } else if (loading && !forceEmpty) {
    content = <div className="text-center py-10 text-muted">Loading…</div>;
  } else if (!blob && !forceEmpty) {
    content = <div className="text-center py-10 text-muted">Path not found</div>;
  } else if (blob && blob.type === "directory") {
    content = <FolderView projectPath={projectPath} revision={revision} path={path} blob={blob} />;
  } else if (blob) {
    content = <FileView blob={blob} />;
  } else {
    content = null;
  }

  // --- Render ---

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Files">
      <div className="project-blob flex-grow-1 d-flex flex-column">
        <div className="head d-flex align-items-center justify-content-between flex-wrap px-3 flex-shrink-0">
          <div className="d-flex flex-wrap align-items-center">
            <span className="revision-picker mr-3 py-2 btn btn-sm btn-light">
              <img src="/~icon/branch.svg" alt="" className="icon mr-1" width={14} height={14} />
              {revision}
            </span>
            <BlobNavigator
              projectPath={projectPath}
              revision={revision}
              path={path}
              mode={isEditMode ? mode : undefined}
              newFileName={newFileName}
              onNewFileNameChange={setNewFileName}
            />
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

            {/* "Add" dropdown — matches OneDev's DropdownLink behavior */}
            {!isEditMode && (
              <span className="dropdown-aware d-inline-block position-relative mr-3">
                <a
                  ref={addTriggerRef}
                  className={`text-nowrap${addDropdownOpen ? " dropdown-open" : ""}`}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setAddDropdownOpen(!addDropdownOpen);
                  }}
                >
                  Add
                </a>
                <InlineDropdown
                  isOpen={addDropdownOpen}
                  onClose={() => setAddDropdownOpen(false)}
                  triggerRef={addTriggerRef}
                >
                  <div className="list-group list-group-flush">
                    <a
                      className="list-group-item list-group-item-action"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAddDropdownOpen(false);
                        enterAddMode();
                      }}
                    >
                      Create New File
                    </a>
                    <a
                      className="list-group-item list-group-item-action"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        setAddDropdownOpen(false);
                        // Upload mode — navigate to upload page
                        const params = new URLSearchParams(searchParams);
                        params.set("mode", "upload");
                        setSearchParams(params);
                      }}
                    >
                      Upload Files
                    </a>
                  </div>
                </InlineDropdown>
              </span>
            )}

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
          {error && !forceEmpty && <div className="alert alert-light-danger m-3">{error}</div>}
          {content}
        </div>
      </div>
    </ProjectLayout>
  );
}
