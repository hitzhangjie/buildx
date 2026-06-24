import { useEffect, useRef, useState, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchBlob, createFile, type BlobContent, type BlobEntry } from "../api/blob";
import { createCodeComment, fetchCodeComments, type CodeComment } from "../api/codeComments";
import { fetchProjects } from "../api/projects";
import type { SearchFileHit, SearchTextHit, SearchSymbolHit } from "../api/search";
import { NoCommitsPanel } from "../components/onedev/panels/NoCommitsPanel";
import { useProjectContext } from "../context/ProjectContext";
import { ProjectLayout } from "../layout/ProjectLayout";
import { getMockReadme } from "../mocks/fixtures/blob";
import { USE_MOCK } from "../mocks/config";
import {
  blobSelectionUrl,
  blobUrl,
  parentBlobUrl,
  parseBlobSegments,
  fileIcon,
  type BlobMode,
} from "../util/blobPath";
import { parseSourcePosition, sourcePositionFromRange, type PlanarRange } from "../util/planarRange";
import { RevisionPicker } from "../components/onedev/panels/RevisionPicker";
import { SourceView } from "../components/onedev/SourceView";
import { useAuth } from "../context/AuthContext";
import { BlobAddEditPanel } from "./project/blob/BlobAddEditPanel";
import { NoNameEditPanel } from "./project/blob/NoNameEditPanel";
import { InlineDropdown } from "../components/onedev/DropdownMenu";
import { CloneDialog } from "../components/onedev/panels/CloneDialog";
import { QuickSearchPanel } from "../components/search/QuickSearchPanel";
import { AdvancedSearchPanel } from "../components/search/AdvancedSearchPanel";
import { SearchResultPanel } from "../components/search/SearchResultPanel";
import { bindBlobSearchShortcuts } from "../util/blobSearchShortcuts";

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
      {isEditing ? (
        <>
          {/* Show all directory parts as clickable links, then the input. */}
          {parts.map((part, index) => {
            const subPath = parts.slice(0, index + 1).join("/");
            return (
              <span key={subPath} className="d-inline-flex align-items-center">
                <span className="text-muted mx-1">/</span>
                <Link to={blobUrl(projectPath, revision, subPath)}>{part}</Link>
              </span>
            );
          })}
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
        </>
      ) : (
        <>
          {/* View mode: all except last as links, last as plain text. */}
          {parts.slice(0, -1).map((part, index) => {
            const subPath = parts.slice(0, index + 1).join("/");
            return (
              <span key={subPath} className="d-inline-flex align-items-center">
                <span className="text-muted mx-1">/</span>
                <Link to={blobUrl(projectPath, revision, subPath)}>{part}</Link>
              </span>
            );
          })}
          {parts.length > 0 && (
            <span className="d-inline-flex align-items-center">
              <span className="text-muted mx-1">/</span>
              <span>{parts[parts.length - 1]}</span>
            </span>
          )}
        </>
      )}
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

function FileView({
  projectPath,
  revision,
  path,
  blob,
  position,
  commentId,
  onPositionChange,
  onCommentChange,
}: {
  projectPath: string;
  revision: string;
  path: string;
  blob: BlobContent;
  position: string | null;
  commentId: string | null;
  onPositionChange: (position: string | null) => void;
  onCommentChange: (commentId: string | null) => void;
}) {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [draftRange, setDraftRange] = useState<PlanarRange | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [savingComment, setSavingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const markPosition = parseSourcePosition(position);
  const loginHref = `/~login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;

  useEffect(() => {
    let cancelled = false;
    void fetchProjects().then((projects) => {
      if (!cancelled) {
        setProjectId(projects.find((p) => p.path === projectPath)?.id ?? null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    if (!blob.commitHash || !projectPath) {
      setComments([]);
      return;
    }
    let cancelled = false;
    void fetchCodeComments(projectPath, blob.commitHash, path)
      .then((items) => {
        if (!cancelled) {
          setComments(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setComments([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [projectPath, blob.commitHash, path]);

  useEffect(() => {
    if (!commentId) {
      return;
    }
    const open = comments.find((c) => String(c.id) === commentId);
    if (open?.mark.range) {
      setDraftRange(open.mark.range);
      setDraftContent(open.content);
    }
  }, [commentId, comments]);

  const handleAddComment = useCallback(
    (range: PlanarRange) => {
      setDraftRange(range);
      setDraftContent("");
      setCommentError(null);
      onCommentChange(null);
      onPositionChange(sourcePositionFromRange(range));
    },
    [onCommentChange, onPositionChange],
  );

  const handleSaveComment = useCallback(async () => {
    if (!projectId || !blob.commitHash || !draftRange || !draftContent.trim()) {
      return;
    }
    setSavingComment(true);
    setCommentError(null);
    try {
      const created = await createCodeComment({
        projectId,
        content: draftContent.trim(),
        mark: {
          commitHash: blob.commitHash,
          path,
          range: draftRange,
        },
      });
      setComments((prev) => [...prev, created]);
      setDraftRange(null);
      setDraftContent("");
      onCommentChange(String(created.id));
      onPositionChange(sourcePositionFromRange(created.mark.range));
    } catch (err) {
      setCommentError((err as Error).message || "Failed to save comment");
    } finally {
      setSavingComment(false);
    }
  }, [
    projectId,
    blob.commitHash,
    draftRange,
    draftContent,
    path,
    onCommentChange,
    onPositionChange,
  ]);

  const handleCancelComment = useCallback(() => {
    setDraftRange(null);
    setDraftContent("");
    setCommentError(null);
    onCommentChange(null);
  }, [onCommentChange]);

  const handleOpenComment = useCallback(
    (comment: CodeComment) => {
      if (!comment.mark.range) {
        return;
      }
      setDraftRange(comment.mark.range);
      setDraftContent(comment.content);
      onCommentChange(String(comment.id));
      onPositionChange(sourcePositionFromRange(comment.mark.range));
    },
    [onCommentChange, onPositionChange],
  );

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
      {commentError && <div className="alert alert-light-danger mx-3 mt-3 mb-0">{commentError}</div>}
      <SourceView
        filePath={path}
        content={blob.content ?? ""}
        position={markPosition}
        selectionUrl={(range) =>
          `${window.location.origin}${blobSelectionUrl(
            projectPath,
            revision,
            path,
            sourcePositionFromRange(range),
          )}`
        }
        loggedIn={Boolean(user)}
        loginHref={loginHref}
        comments={comments}
        draftRange={draftRange}
        draftContent={draftContent}
        onDraftContentChange={setDraftContent}
        onAddComment={handleAddComment}
        onSaveComment={() => void handleSaveComment()}
        onCancelComment={handleCancelComment}
        onOpenComment={handleOpenComment}
        savingComment={savingComment}
      />
    </>
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
  const editMode = mode === "add" || mode === "edit";
  const initialPath = searchParams.get("initialPath") || undefined;
  const position = searchParams.get("position");
  const commentId = searchParams.get("comment");

  const updateBlobQuery = useCallback(
    (updates: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value) {
              next.set(key, value);
            } else {
              next.delete(key);
            }
          }
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // Blob data state
  const [blob, setBlob] = useState<BlobContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const displayRevision = revision || blob?.revision || "";

  // ADD/EDIT mode state
  const [newFileName, setNewFileName] = useState(initialPath ?? "");

  // Clone dialog state
  const [cloneDropdownOpen, setCloneDropdownOpen] = useState(false);
  const cloneTriggerRef = useRef<HTMLAnchorElement>(null);

  // Search state
  const [searchOpen, setSearchOpen] = useState<"quick" | "advanced" | null>(null);
  const [searchResults, setSearchResults] = useState<{
    textHits?: SearchTextHit[];
    fileHits?: SearchFileHit[];
    symbolHits?: SearchSymbolHit[];
    hasMore: boolean;
    searchType: "text" | "file" | "symbol";
    query: string;
  } | null>(null);

  // Support ?empty=1 to preview the empty-project guidance
  const forceEmpty = searchParams.get("empty") === "1";


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

  // Keyboard shortcuts: t = quick search, v = advanced search (OneDev project-blob.js).
  const openQuickSearchRef = useRef(() => setSearchOpen("quick"));
  const openAdvancedSearchRef = useRef(() => setSearchOpen("advanced"));
  openQuickSearchRef.current = () => setSearchOpen("quick");
  openAdvancedSearchRef.current = () => setSearchOpen("advanced");

  useEffect(() => {
    return bindBlobSearchShortcuts({
      onQuickSearch: () => openQuickSearchRef.current(),
      onAdvancedSearch: () => openAdvancedSearchRef.current(),
    });
  }, []);

  // When viewing a file and entering add/edit mode, the new file should be
  // created in the file's parent directory, not "inside" the file.
  const directoryPath =
    editMode && blob?.type === "file"
      ? path.split("/").slice(0, -1).join("/")
      : path;

  // Compute effective new file path (directory + new file name).
  const newFilePath = newFileName
    ? (directoryPath ? `${directoryPath}/${newFileName}` : newFileName)
    : "";

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
      const rev = displayRevision || revision;
      await createFile(projectPath!, rev, filePath, content, commitMessage);
      // Navigate to the newly created file in view mode
      navigate(blobUrl(projectPath!, rev, filePath), { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to create file");
    }
  }, [projectPath, revision, displayRevision, newFilePath, navigate]);

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

  const hasNoCommits =
    !loading &&
    !error &&
    path === "" &&
    (!blob || (blob.type === "directory" && !(blob.entries?.length)));
  const isEmpty = forceEmpty || hasNoCommits;

  let content: React.ReactNode;

  if (editMode) {
    // ADD or EDIT mode override the normal view
    if (mode === "add" && !newFileName) {
      // No file name entered yet — show prompt
      content = (
        <>
          <NoNameEditPanel />
          {/* Also show the folder view beneath so user can see where they are */}
          {blob && blob.type === "directory" && !isEmpty && (
            <FolderView projectPath={projectPath} revision={displayRevision || revision} path={path} blob={blob} />
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
          revision={displayRevision || revision}
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
    content = <FolderView projectPath={projectPath} revision={displayRevision || revision} path={path} blob={blob} />;
  } else if (blob) {
    content = (
      <FileView
        projectPath={projectPath}
        revision={displayRevision || revision}
        path={path}
        blob={blob}
        position={position}
        commentId={commentId}
        onPositionChange={(nextPosition) => updateBlobQuery({ position: nextPosition })}
        onCommentChange={(nextCommentId) => updateBlobQuery({ comment: nextCommentId })}
      />
    );
  } else {
    content = null;
  }

  // --- Render ---

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Files">
      <div className="project-blob flex-grow-1 d-flex flex-column">
        <div className="head d-flex align-items-center justify-content-between flex-wrap px-3 flex-shrink-0">
          <div className="d-flex flex-wrap align-items-center">
            <RevisionPicker
              projectPath={projectPath}
              currentRevision={displayRevision || revision}
              currentPath={path}
            />
            <BlobNavigator
              projectPath={projectPath}
              revision={displayRevision || revision}
              path={editMode ? directoryPath : path}
              mode={editMode ? mode : undefined}
              newFileName={newFileName}
              onNewFileNameChange={setNewFileName}
            />
          </div>
          <div className="blob-operations py-2">
            <span className="dropdown-aware d-inline-block position-relative mr-4">
              <a
                ref={cloneTriggerRef}
                href="#"
                className={`font-weight-boldest font-size-lg text-nowrap link-info${cloneDropdownOpen ? " dropdown-open" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setCloneDropdownOpen(!cloneDropdownOpen);
                }}
              >
                <img src="/~icon/download2.svg" alt="" className="icon mr-1" width={16} height={16} />
                Clone
              </a>
              <CloneDialog
                isOpen={cloneDropdownOpen}
                onClose={() => setCloneDropdownOpen(false)}
                triggerRef={cloneTriggerRef}
                projectPath={projectPath}
              />
            </span>

            {!editMode && (
              <InlineDropdown
                wrapperClassName="mr-3"
                className="text-nowrap"
                label={
                  <>
                    <img src="/~icon/plus.svg" alt="" className="icon mr-1" width={14} height={14} />
                    Add
                  </>
                }
              >
                {({ close }) => (
                  <div className="list-group list-group-flush">
                    <a
                      className="list-group-item list-group-item-action"
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        close();
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
                        close();
                        const params = new URLSearchParams(searchParams);
                        params.set("mode", "upload");
                        setSearchParams(params);
                      }}
                    >
                      Upload Files
                    </a>
                  </div>
                )}
              </InlineDropdown>
            )}

            <InlineDropdown
              wrapperClassName="mr-3"
              className="text-nowrap"
              label={
                <>
                  <img src="/~icon/magnify.svg" alt="" className="icon mr-1" width={14} height={14} />
                  Search
                </>
              }
            >
              {({ close }) => (
                <div className="list-group list-group-flush">
                  <a
                    className="list-group-item list-group-item-action"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      close();
                      setSearchOpen("quick");
                    }}
                  >
                    Quick Search
                  </a>
                  <a
                    className="list-group-item list-group-item-action"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      close();
                      setSearchOpen("advanced");
                    }}
                  >
                    Advanced Search
                  </a>
                </div>
              )}
            </InlineDropdown>
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

        {/* Search Result Panel — bottom-docked, resizable */}
        {searchResults && (
          <SearchResultPanel
            textHits={searchResults.textHits}
            fileHits={searchResults.fileHits}
            symbolHits={searchResults.symbolHits}
            hasMore={searchResults.hasMore}
            searchType={searchResults.searchType}
            query={searchResults.query}
            onClose={() => setSearchResults(null)}
            onNavigateToLine={(filePath, lineNo) => {
              const rev = displayRevision || revision;
              const url = lineNo != null
                ? `${blobUrl(projectPath, rev, filePath)}#L${lineNo}`
                : blobUrl(projectPath, rev, filePath);
              navigate(url);
            }}
          />
        )}
      </div>

      {/* Search modals */}
      {searchOpen === "quick" && (
        <QuickSearchPanel
          isOpen={true}
          projectPath={projectPath}
          revision={displayRevision || revision}
          currentPath={path}
          onClose={() => setSearchOpen(null)}
          onSelectFile={(filePath) => {
            navigate(blobUrl(projectPath, displayRevision || revision, filePath));
          }}
          onOpenAdvanced={() => setSearchOpen("advanced")}
        />
      )}

      {searchOpen === "advanced" && (
        <AdvancedSearchPanel
          isOpen={true}
          projectPath={projectPath}
          revision={displayRevision || revision}
          currentPath={path}
          onClose={() => setSearchOpen(null)}
          onSearchComplete={(hits, type, hasMore, query) => {
            setSearchResults({
              textHits: type === "text" ? (hits as SearchTextHit[]) : undefined,
              fileHits: type === "file" ? (hits as SearchFileHit[]) : undefined,
              symbolHits: type === "symbol" ? (hits as SearchSymbolHit[]) : undefined,
              hasMore,
              searchType: type,
              query,
            });
          }}
        />
      )}
    </ProjectLayout>
  );
}
