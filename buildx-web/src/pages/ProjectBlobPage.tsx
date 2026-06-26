import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { fetchBlob, createFile, updateFile, deleteFile, blobDownloadUrl, type BlobContent, type BlobEntry } from "../api/blob";
import {
  createCodeComment,
  createCodeCommentReply,
  deleteCodeComment,
  fetchCodeCommentReplies,
  fetchCodeComments,
  setCodeCommentResolved,
  type CodeComment,
  type CodeCommentReply,
} from "../api/codeComments";
import { fetchProjects } from "../api/projects";
import { fetchBranches } from "../api/repositories";
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
import { MarkdownContent } from "../components/onedev/MarkdownContent";
import { useAuth } from "../context/AuthContext";
import { BlobAddEditPanel } from "./project/blob/BlobAddEditPanel";
import { BuildSpecBlobEditPanel } from "../components/buildspec/BuildSpecBlobEditPanel";
import { BuildSpecBlobViewPanel } from "../components/buildspec/BuildSpecBlobViewPanel";
import { isBuildSpecPath, BUILD_SPEC_PATH, LEGACY_BUILD_SPEC_PATH } from "../buildspec/path";
import { NoNameEditPanel } from "./project/blob/NoNameEditPanel";
import { CommitOptionPanel } from "./project/blob/CommitOptionPanel";
import { InlineDropdown } from "../components/onedev/DropdownMenu";
import { CloneDialog } from "../components/onedev/panels/CloneDialog";
import { QuickSearchPanel } from "../components/search/QuickSearchPanel";
import { AdvancedSearchPanel } from "../components/search/AdvancedSearchPanel";
import { SearchResultPanel } from "../components/search/SearchResultPanel";
import "./project-blob-page.css";
import { bindBlobSearchShortcuts } from "../util/blobSearchShortcuts";
import { Icon } from "../components/onedev/Icon";

function hasBuildSpec(entries?: BlobEntry[]): boolean {
  if (!entries) {
    return false;
  }
  return entries.some(
    (entry) =>
      entry.type === "file" &&
      (entry.name === BUILD_SPEC_PATH ||
        entry.name === LEGACY_BUILD_SPEC_PATH ||
        entry.path === BUILD_SPEC_PATH ||
        entry.path === LEGACY_BUILD_SPEC_PATH),
  );
}

function isOnBranch(revision: string, branches: string[]): boolean {
  if (!revision) {
    return true;
  }
  if (isCommitHash(revision)) {
    return false;
  }
  return branches.length === 0 || branches.includes(revision);
}

function isMarkdownFile(path: string) {
  return /\.(md|markdown)$/i.test(path);
}

function isCommitHash(revision: string) {
  return /^[0-9a-f]{40}$/i.test(revision);
}

function formatByteSize(size: number) {
  if (size < 1024) {
    return `${size} bytes`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

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
// BuildSupportNote — CI/CD setup hint at repo root (OneDev buildSupportNote)
// ---------------------------------------------------------------------------

function BuildSupportNote({ onAddBuildSpec }: { onAddBuildSpec: () => void }) {
  return (
    <div className="build-support-note p-3 flex-shrink-0">
      <Icon name="bulb" className="icon" />
      {" Enable CI/CD by "}
      <a
        href="#"
        className="link-primary"
        onClick={(e) => {
          e.preventDefault();
          onAddBuildSpec();
        }}
      >
        adding {BUILD_SPEC_PATH}
      </a>
    </div>
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
  const [readmeContent, setReadmeContent] = useState<string | null>(null);
  const [readmeTitle, setReadmeTitle] = useState<string>("README.md");
  const isRootPath = path === "";
  const readmeEntry =
    isRootPath
      ? (blob.entries ?? []).find(
          (entry) => entry.type === "file" && /^readme(?:\..+)?$/i.test(entry.name),
        ) ?? null
      : null;
  const visibleEntries = isRootPath
    ? (blob.entries ?? []).filter((entry) => entry.path !== readmeEntry?.path)
    : (blob.entries ?? []);

  useEffect(() => {
    if (!isRootPath || !readmeEntry) {
      setReadmeContent(null);
      setReadmeTitle("README.md");
      return;
    }
    const currentReadmeEntry = readmeEntry;
    let cancelled = false;
    async function loadReadme() {
      if (USE_MOCK) {
        const mockReadme = getMockReadme(path);
        if (!cancelled && mockReadme) {
          setReadmeTitle(mockReadme.title);
          setReadmeContent(mockReadme.content);
        }
        return;
      }
      try {
        const readmeBlob = await fetchBlob(projectPath, revision, currentReadmeEntry.path);
        if (!cancelled) {
          setReadmeTitle(currentReadmeEntry.name);
          setReadmeContent(readmeBlob?.type === "file" ? (readmeBlob.content ?? "") : null);
        }
      } catch {
        if (!cancelled) {
          setReadmeTitle(currentReadmeEntry.name);
          setReadmeContent(null);
        }
      }
    }
    void loadReadme();
    return () => {
      cancelled = true;
    };
  }, [isRootPath, path, projectPath, readmeEntry, revision]);

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
          {visibleEntries.map((entry) => (
            <FolderRow
              key={entry.path}
              projectPath={projectPath}
              revision={revision}
              entry={entry}
            />
          ))}
        </tbody>
      </table>
      {readmeEntry && readmeContent !== null && (
        <div className="readme">
          <div className="head">
            <b className="title mr-2">{readmeTitle}</b>
          </div>
          <div className="body p-4">
            <MarkdownContent content={readmeContent} className="font-size-sm" />
          </div>
        </div>
      )}
    </div>
  );
}

function commentsMatchMark(
  comment: CodeComment,
  commitHash: string,
  path: string,
): boolean {
  if (comment.mark.path !== path) {
    return false;
  }
  const stored = comment.mark.commitHash;
  return (
    stored === commitHash ||
    stored.startsWith(commitHash) ||
    commitHash.startsWith(stored)
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
  canModify,
  onEdit,
  onDelete,
  onPositionChange,
  onCommentChange,
}: {
  projectPath: string;
  revision: string;
  path: string;
  blob: BlobContent;
  position: string | null;
  commentId: string | null;
  canModify: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onPositionChange: (position: string | null) => void;
  onCommentChange: (commentId: string | null) => void;
}) {
  const { user } = useAuth();
  const [projectId, setProjectId] = useState<number | null>(null);
  const [comments, setComments] = useState<CodeComment[]>([]);
  const [draftRange, setDraftRange] = useState<PlanarRange | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [activeComment, setActiveComment] = useState<CodeComment | null>(null);
  const [replies, setReplies] = useState<CodeCommentReply[]>([]);
  const [loadingReplies, setLoadingReplies] = useState(false);
  const [replying, setReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [updatingComment, setUpdatingComment] = useState(false);
  const [savingComment, setSavingComment] = useState(false);
  const [resolvingProjectId, setResolvingProjectId] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [commentPanelVisible, setCommentPanelVisible] = useState(true);

  const onCommentChangeRef = useRef(onCommentChange);
  onCommentChangeRef.current = onCommentChange;
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;

  const markPosition = parseSourcePosition(position);
  const loginHref = `/~login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
  const isMarkdown = isMarkdownFile(path);
  const isBuildSpec = isBuildSpecPath(path);
  const fileName = path.split("/").pop() ?? path;
  const downloadUrl = blobDownloadUrl(projectPath, revision, path);
  const editTitle = revision ? `Edit on branch ${revision}` : "Edit file";
  const deleteTitle = revision ? `Delete from branch ${revision}` : "Delete file";

  const resolveProjectId = useCallback(async () => {
    setResolvingProjectId(true);
    try {
      const projects = await fetchProjects();
      const id = projects.find((p) => p.path === projectPath)?.id ?? null;
      setProjectId(id);
      return id;
    } catch {
      setProjectId(null);
      return null;
    } finally {
      setResolvingProjectId(false);
    }
  }, [projectPath]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setResolvingProjectId(true);
      try {
        const projects = await fetchProjects();
        if (!cancelled) {
          setProjectId(projects.find((p) => p.path === projectPath)?.id ?? null);
        }
      } catch {
        if (!cancelled) {
          setProjectId(null);
        }
      } finally {
        if (!cancelled) {
          setResolvingProjectId(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  useEffect(() => {
    setComments([]);
    setActiveComment(null);
    setReplies([]);
    setReplying(false);
    setReplyContent("");
    setDraftRange(null);
    setDraftContent("");
    setCommentPanelVisible(true);

    if (!blob.commitHash || !projectPath || !path.trim()) {
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

  const fileComments = useMemo(
    () =>
      blob.commitHash
        ? comments.filter((c) => commentsMatchMark(c, blob.commitHash!, path))
        : [],
    [comments, blob.commitHash, path],
  );

  useEffect(() => {
    if (!commentId) {
      return;
    }
    const open = fileComments.find((c) => String(c.id) === commentId);
    if (open) {
      setActiveComment(open);
      setDraftRange(null);
      setDraftContent("");
      setCommentPanelVisible(true);
      if (open.mark.range) {
        onPositionChangeRef.current(sourcePositionFromRange(open.mark.range));
      }
      return;
    }
    if (fileComments.length > 0) {
      onCommentChangeRef.current(null);
      onPositionChangeRef.current(null);
    }
  }, [commentId, fileComments]);

  useEffect(() => {
    if (!activeComment) {
      return;
    }
    let cancelled = false;
    setLoadingReplies(true);
    void fetchCodeCommentReplies(activeComment.id)
      .then((items) => {
        if (!cancelled) {
          setReplies(items);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setReplies([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingReplies(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeComment]);

  const handleAddComment = useCallback(
    (range: PlanarRange) => {
      setDraftRange(range);
      setDraftContent("");
      setActiveComment(null);
      setReplies([]);
      setReplying(false);
      setReplyContent("");
      setCommentError(null);
      setCommentPanelVisible(true);
      onCommentChange(null);
      onPositionChange(sourcePositionFromRange(range));
    },
    [onCommentChange, onPositionChange],
  );

  const handleSaveComment = useCallback(async () => {
    if (!blob.commitHash || !draftRange || !draftContent.trim()) {
      return;
    }
    let targetProjectId = projectId;
    if (!targetProjectId) {
      targetProjectId = await resolveProjectId();
    }
    if (!targetProjectId) {
      setCommentError("Unable to resolve project for this file. Please refresh and try again.");
      return;
    }
    setSavingComment(true);
    setCommentError(null);
    try {
      const created = await createCodeComment({
        projectId: targetProjectId,
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
      setActiveComment(created);
      setCommentPanelVisible(true);
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
    resolveProjectId,
  ]);

  const handleCancelComment = useCallback(() => {
    setDraftRange(null);
    setDraftContent("");
    setActiveComment(null);
    setReplies([]);
    setReplying(false);
    setReplyContent("");
    setCommentError(null);
    setCommentPanelVisible(true);
    onPositionChange(null);
    onCommentChange(null);
  }, [onCommentChange, onPositionChange]);

  const handleHideCommentPanel = useCallback(() => {
    setCommentPanelVisible(false);
    setReplying(false);
    setReplyContent("");
    onPositionChange(null);
    onCommentChange(null);
  }, [onCommentChange, onPositionChange]);

  const handleOpenComment = useCallback(
    (comment: CodeComment) => {
      if (!comment.mark.range) {
        return;
      }
      const positionValue = sourcePositionFromRange(comment.mark.range);
      if (activeComment?.id === comment.id) {
        if (commentPanelVisible) {
          return;
        }
        setReplying(false);
        setReplyContent("");
        setCommentPanelVisible(true);
        onCommentChange(String(comment.id));
        onPositionChange(positionValue);
        return;
      }
      setDraftRange(null);
      setDraftContent("");
      setActiveComment(comment);
      setReplying(false);
      setReplyContent("");
      setCommentPanelVisible(true);
      onCommentChange(String(comment.id));
      onPositionChange(positionValue);
    },
    [activeComment, commentPanelVisible, onCommentChange, onPositionChange],
  );

  const handleCreateReply = useCallback(async () => {
    if (!activeComment || !replyContent.trim()) {
      return;
    }
    setSavingReply(true);
    setCommentError(null);
    try {
      const created = await createCodeCommentReply(activeComment.id, replyContent.trim());
      setReplies((prev) => [...prev, created]);
      setReplyContent("");
      setReplying(false);
      setComments((prev) =>
        prev.map((c) => (c.id === activeComment.id ? { ...c, replyCount: c.replyCount + 1 } : c)),
      );
      setActiveComment((prev) => (prev ? { ...prev, replyCount: prev.replyCount + 1 } : prev));
    } catch (err) {
      setCommentError((err as Error).message || "Failed to reply");
    } finally {
      setSavingReply(false);
    }
  }, [activeComment, replyContent]);

  const handleToggleResolved = useCallback(async () => {
    if (!activeComment) {
      return;
    }
    setUpdatingComment(true);
    setCommentError(null);
    try {
      const updated = await setCodeCommentResolved(activeComment.id, !activeComment.resolved);
      setActiveComment(updated);
      setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err) {
      setCommentError((err as Error).message || "Failed to update resolved state");
    } finally {
      setUpdatingComment(false);
    }
  }, [activeComment]);

  const handleDeleteComment = useCallback(async () => {
    if (!activeComment) {
      return;
    }
    if (!window.confirm("Delete this code comment thread?")) {
      return;
    }
    setUpdatingComment(true);
    setCommentError(null);
    try {
      await deleteCodeComment(activeComment.id);
      setComments((prev) => prev.filter((c) => c.id !== activeComment.id));
      setActiveComment(null);
      setReplies([]);
      setReplying(false);
      setReplyContent("");
      onCommentChange(null);
      onPositionChange(null);
    } catch (err) {
      const apiErr = err as { status?: number; message?: string };
      if (apiErr.status === 404) {
        // Treat missing comment as already deleted to keep UI consistent.
        setComments((prev) => prev.filter((c) => c.id !== activeComment.id));
        setActiveComment(null);
        setReplies([]);
        setReplying(false);
        setReplyContent("");
        onCommentChange(null);
        onPositionChange(null);
        return;
      }
      setCommentError(apiErr.message || "Failed to delete comment");
    } finally {
      setUpdatingComment(false);
    }
  }, [activeComment, onCommentChange, onPositionChange]);

  return (
    <div className="blob-view d-flex flex-column flex-grow-1">
      <div className="head d-flex align-items-center px-3 py-2 justify-content-between flex-shrink-0">
        <div className="info d-none d-xl-block mr-4 text-gray">
          {blob.size !== undefined ? <span>{formatByteSize(blob.size)}</span> : null}
        </div>
        <div className="tools d-flex align-items-center">
          <div className="actions d-flex align-items-center">
            {canModify && (
              <>
                <span title={editTitle}>
                  <a
                    href="#"
                    className="btn btn-xs btn-light btn-hover-primary btn-icon"
                    onClick={(e) => {
                      e.preventDefault();
                      onEdit();
                    }}
                  >
                    <img src="/~icon/edit.svg" alt="" className="icon" width={14} height={14} />
                  </a>
                </span>
                <span title={deleteTitle}>
                  <a
                    href="#"
                    className="btn btn-xs btn-light btn-hover-danger btn-icon ml-1"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                  >
                    <img src="/~icon/trash.svg" alt="" className="icon" width={14} height={14} />
                  </a>
                </span>
              </>
            )}
            <a
              href={downloadUrl}
              className="btn btn-xs btn-light btn-hover-primary btn-icon ml-1"
              title="Download"
              download={fileName}
            >
              <img src="/~icon/download2.svg" alt="" className="icon" width={14} height={14} />
            </a>
          </div>
        </div>
      </div>
      <div className="body autofit flex-grow-1 d-flex flex-column">
        {commentError && <div className="alert alert-light-danger mx-3 mt-3 mb-0">{commentError}</div>}
        {isMarkdown ? (
          <div className="p-4">
            <MarkdownContent content={blob.content ?? ""} />
          </div>
        ) : isBuildSpec ? (
          <BuildSpecBlobViewPanel
            filePath={path}
            content={blob.content ?? ""}
            position={position}
            onPositionChange={onPositionChange}
          />
        ) : (
          <SourceView
            filePath={path}
            commitHash={blob.commitHash}
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
            comments={fileComments}
            draftRange={draftRange}
            draftContent={draftContent}
            onDraftContentChange={setDraftContent}
            onAddComment={handleAddComment}
            onSaveComment={() => void handleSaveComment()}
            onCancelComment={handleCancelComment}
            onHideCommentPanel={handleHideCommentPanel}
            onOpenComment={handleOpenComment}
            savingComment={savingComment || resolvingProjectId}
            activeComment={activeComment}
            commentPanelVisible={commentPanelVisible}
            replies={replies}
            loadingReplies={loadingReplies}
            replying={replying}
            replyDraft={replyContent}
            savingReply={savingReply}
            updatingComment={updatingComment}
            onReplyDraftChange={setReplyContent}
            onStartReply={() => setReplying(true)}
            onCancelReply={() => {
              setReplying(false);
              setReplyContent("");
            }}
            onCreateReply={() => void handleCreateReply()}
            onToggleResolved={() => void handleToggleResolved()}
            onDeleteComment={() => void handleDeleteComment()}
          />
        )}
      </div>
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
  const { user } = useAuth();

  // Parse mode and extra params from URL
  const mode: BlobMode = (searchParams.get("mode") as BlobMode) || "view";
  const editMode = mode === "add" || mode === "edit";
  const deleteMode = mode === "delete";
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
  const [branches, setBranches] = useState<string[]>([]);

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

  // Load branch names for edit/delete eligibility (branch-only modifications).
  useEffect(() => {
    if (!projectPath) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const projects = await fetchProjects();
        const project = projects.find((p) => p.path === projectPath);
        if (!project || cancelled) {
          return;
        }
        const branchNames = await fetchBranches(project.id);
        if (!cancelled) {
          setBranches(branchNames);
        }
      } catch {
        if (!cancelled) {
          setBranches([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectPath]);

  // Clear edit state when mode changes to view
  useEffect(() => {
    if (mode === "view") {
      setNewFileName("");
    } else if (mode === "edit" && path) {
      setNewFileName(path.split("/").pop() ?? "");
    }
  }, [mode, path]);

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

  const activeRevision = displayRevision || revision;
  const canModifyFile =
    Boolean(user) &&
    !isCommitHash(activeRevision) &&
    (activeRevision === "" || branches.includes(activeRevision));

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

  const enterEditMode = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", "edit");
    params.delete("initialPath");
    setSearchParams(params, { replace: false });
    setNewFileName(path.split("/").pop() ?? "");
  }, [searchParams, setSearchParams, path]);

  const enterDeleteMode = useCallback(() => {
    const params = new URLSearchParams(searchParams);
    params.set("mode", "delete");
    params.delete("initialPath");
    setSearchParams(params, { replace: false });
  }, [searchParams, setSearchParams]);

  // Handle commit from BlobAddEditPanel or delete panel
  const handleCommit = useCallback(async (commitMessage: string, content: string) => {
    const rev = displayRevision || revision;

    try {
      if (mode === "delete") {
        await deleteFile(projectPath!, rev, path, commitMessage);
        const parent = path.includes("/") ? path.split("/").slice(0, -1).join("/") : "";
        navigate(blobUrl(projectPath!, rev, parent), { replace: true });
        return;
      }

      const filePath = mode === "edit" ? path : newFilePath;
      if (!filePath) {
        return;
      }

      if (mode === "edit") {
        await updateFile(projectPath!, rev, filePath, content, commitMessage);
      } else {
        await createFile(projectPath!, rev, filePath, content, commitMessage);
      }
      navigate(blobUrl(projectPath!, rev, filePath), { replace: true });
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to save changes");
    }
  }, [projectPath, revision, displayRevision, mode, path, newFilePath, navigate]);

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
  const showBuildSupportNote =
    mode === "view" &&
    path === "" &&
    !isEmpty &&
    !loading &&
    !error &&
    blob?.type === "directory" &&
    isOnBranch(activeRevision, branches) &&
    !hasBuildSpec(blob.entries);

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
      const editFilePath = mode === "edit" ? path : newFilePath;
      const editingBuildSpec = isBuildSpecPath(editFilePath);
      content = editingBuildSpec ? (
        <BuildSpecBlobEditPanel
          filePath={editFilePath}
          initialContent={existingContent}
          revision={displayRevision || revision}
          mode={mode === "edit" ? "edit" : "add"}
          position={position}
          onPositionChange={(nextPosition) => updateBlobQuery({ position: nextPosition })}
          onCancel={handleCancelEdit}
          onCommit={handleCommit}
        />
      ) : (
        <BlobAddEditPanel
          filePath={editFilePath}
          initialContent={existingContent}
          revision={displayRevision || revision}
          mode={mode === "edit" ? "edit" : "add"}
          onCancel={handleCancelEdit}
          onCommit={handleCommit}
        />
      );
    }
  } else if (deleteMode && blob?.type === "file") {
    const fileName = path.split("/").pop() ?? "";
    content = (
      <CommitOptionPanel
        fileName={fileName}
        action="delete"
        onCancel={handleCancelEdit}
        onCommit={(commitMessage) => void handleCommit(commitMessage, "")}
      />
    );
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
        canModify={canModifyFile}
        onEdit={enterEditMode}
        onDelete={enterDeleteMode}
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

            {!editMode && !deleteMode && (
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
                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      close();
                      setSearchOpen("quick");
                    }}
                  >
                    <span>Quick Search</span>
                    <span className="text-muted pl-3">T</span>
                  </a>
                  <a
                    className="list-group-item list-group-item-action d-flex align-items-center justify-content-between"
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      close();
                      setSearchOpen("advanced");
                    }}
                  >
                    <span>Advanced Search</span>
                    <span className="text-muted pl-3">V</span>
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

        {showBuildSupportNote && (
          <BuildSupportNote onAddBuildSpec={() => enterAddMode(BUILD_SPEC_PATH)} />
        )}

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
