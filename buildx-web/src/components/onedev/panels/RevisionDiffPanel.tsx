import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import { DropdownMenu } from "../DropdownMenu";
import type { FileDiff } from "../../../api/repositories";
import type { CodeComment } from "../../../api/codeComments";
import {
  WHITESPACE_OPTIONS,
  comparePatchUrl,
  type WhitespaceOption,
} from "../../../api/compare";
import {
  type DiffViewMode,
  parseSplitDiffRows,
  readDiffViewMode,
  writeDiffViewMode,
} from "../../../util/diffView";
import { sourcePositionFromRange } from "../../../util/planarRange";
import "./revision-diff-panel.css";

interface RevisionDiffPanelProps {
  projectPath: string;
  projectId: number;
  oldRevision: string;
  newRevision: string;
  rightRevisionLabel: string;
  diffs: FileDiff[];
  comments: CodeComment[];
  pathFilter: string;
  whitespaceOption: WhitespaceOption;
  activeCommentId?: number | null;
  onPathFilterChange: (value: string) => void;
  onWhitespaceOptionChange: (value: WhitespaceOption) => void;
  onCommentSelect: (commentId: number | null) => void;
  loading?: boolean;
}

type NavNode = {
  name: string;
  path?: string;
  children: NavNode[];
};

const NAV_STORAGE_KEY = "revisionDiff.navigation";

const VIEW_MODE_OPTIONS: { value: DiffViewMode; label: string }[] = [
  { value: "UNIFIED", label: "Unified view" },
  { value: "SPLIT", label: "Split view" },
];

function buildNavTree(paths: string[]): NavNode[] {
  const root: NavNode[] = [];
  for (const path of [...paths].sort()) {
    const parts = path.split("/");
    let level = root;
    for (let i = 0; i < parts.length; i++) {
      const isFile = i === parts.length - 1;
      let node = level.find((n) => n.name === parts[i]);
      if (!node) {
        node = {
          name: parts[i],
          children: [],
          ...(isFile ? { path } : {}),
        };
        level.push(node);
      } else if (isFile) {
        node.path = path;
      }
      level = node.children;
    }
  }
  return root;
}

function diffElementId(path: string): string {
  return `diff-${path.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

function NavTree({
  nodes,
  activePath,
  onSelect,
}: {
  nodes: NavNode[];
  activePath: string | null;
  onSelect: (path: string) => void;
}) {
  if (nodes.length === 0) {
    return null;
  }
  return (
    <ul className="list-unstyled mb-0">
      {nodes.map((node) => (
        <li key={node.path ?? node.name} className="tree-content">
          {node.path ? (
            <a
              href={`#${diffElementId(node.path)}`}
              className={activePath === node.path ? "active" : ""}
              onClick={(e) => {
                e.preventDefault();
                onSelect(node.path!);
              }}
            >
              <Icon name="file" className="icon mr-1" width={12} height={12} />
              <span>{node.name}</span>
            </a>
          ) : (
            <span className="text-muted d-inline-flex align-items-center py-1">
              <Icon name="folder" className="icon mr-1" width={12} height={12} />
              <span>{node.name}</span>
            </span>
          )}
          {node.children.length > 0 && (
            <div className="ml-3">
              <NavTree nodes={node.children} activePath={activePath} onSelect={onSelect} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function SplitDiffBody({ diff }: { diff: string }) {
  const rows = useMemo(() => parseSplitDiffRows(diff), [diff]);
  return (
    <div className="split-diff border rounded overflow-auto" style={{ maxHeight: 600 }}>
      <table className="table table-sm mb-0 font-size-xs" style={{ fontFamily: "monospace" }}>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx}>
              <td
                className={`split-diff-old py-0 pr-2 border-right${
                  row.leftType === "delete" ? " bg-light-danger" : ""
                }`}
                style={{ width: "50%", whiteSpace: "pre" }}
              >
                {row.left}
              </td>
              <td
                className={`split-diff-new py-0 pl-2${
                  row.rightType === "add" ? " bg-light-success" : ""
                }`}
                style={{ width: "50%", whiteSpace: "pre" }}
              >
                {row.right}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CommentSidePanel({
  comment,
  projectPath,
  rightRevisionLabel,
  onClose,
  onLocate,
}: {
  comment: CodeComment;
  projectPath: string;
  rightRevisionLabel: string;
  onClose: () => void;
  onLocate: () => void;
}) {
  const position = comment.mark.range ? sourcePositionFromRange(comment.mark.range) : null;
  const fileUrl = `/${projectPath}/~files/${rightRevisionLabel}/${comment.mark.path}${
    position ? `?position=${encodeURIComponent(position)}&comment=${comment.id}` : `?comment=${comment.id}`
  }`;

  return (
    <div className="comment need-width border border-right-0 rounded d-flex overflow-hidden flex-shrink-0 position-sticky mr-3">
      <div className="content flex-grow-1 overflow-hidden d-flex flex-column" style={{ minWidth: 280, maxWidth: 360 }}>
        <div className="head d-flex align-items-center px-3 py-2 border-bottom">
          <h6 className="mb-0 mr-2">Code Comment</h6>
          {comment.resolved && (
            <span className="mr-2 badge badge-sm badge-warning">resolved</span>
          )}
          <button
            type="button"
            className="btn btn-xs btn-icon btn-hover-primary btn-light locate ml-2 mr-3"
            title="Show commented code snippet"
            onClick={onLocate}
          >
            <Icon name="hand" />
          </button>
          <button
            type="button"
            className="btn btn-xs btn-icon ml-auto"
            title="Hide comment"
            onClick={onClose}
          >
            <Icon name="times" />
          </button>
        </div>
        <div className="body overflow-auto flex-grow-1 p-3">
          <div className="font-size-sm text-muted mb-2">
            {comment.user?.fullName ?? comment.user?.name ?? "Unknown"} on{" "}
            <code>{comment.mark.path}</code>
          </div>
          <div className="mb-3">{comment.content}</div>
          <Link to={fileUrl} className="btn btn-sm btn-light">
            Open in file view
          </Link>
        </div>
      </div>
    </div>
  );
}

export function RevisionDiffPanel({
  projectPath,
  projectId,
  oldRevision,
  newRevision,
  rightRevisionLabel,
  diffs,
  comments,
  pathFilter,
  whitespaceOption,
  activeCommentId,
  onPathFilterChange,
  onWhitespaceOptionChange,
  onCommentSelect,
  loading,
}: RevisionDiffPanelProps) {
  const [draftFilter, setDraftFilter] = useState(pathFilter);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(
    () => localStorage.getItem(NAV_STORAGE_KEY) === "true",
  );
  const [viewMode, setViewMode] = useState<DiffViewMode>(() => readDiffViewMode());
  const [activePath, setActivePath] = useState<string | null>(null);
  const optionsRef = useRef<HTMLAnchorElement>(null);

  const commentsByPath = useMemo(() => {
    const map = new Map<string, CodeComment[]>();
    for (const c of comments) {
      const list = map.get(c.mark.path) ?? [];
      list.push(c);
      map.set(c.mark.path, list);
    }
    return map;
  }, [comments]);

  const activeComment = useMemo(
    () => comments.find((c) => c.id === activeCommentId) ?? null,
    [comments, activeCommentId],
  );

  useEffect(() => {
    setDraftFilter(pathFilter);
  }, [pathFilter]);

  useEffect(() => {
    localStorage.setItem(NAV_STORAGE_KEY, navigationOpen ? "true" : "false");
  }, [navigationOpen]);

  useEffect(() => {
    if (activeComment) {
      scrollToPath(activeComment.mark.path);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeComment?.id]);

  const totalAdditions = diffs.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = diffs.reduce((sum, f) => sum + f.deletions, 0);
  const navTree = useMemo(() => buildNavTree(diffs.map((d) => d.path)), [diffs]);
  const patchUrl = comparePatchUrl(projectId, oldRevision, newRevision, whitespaceOption);

  function handleFilterSubmit(e: FormEvent) {
    e.preventDefault();
    onPathFilterChange(draftFilter.trim());
  }

  function scrollToPath(path: string) {
    setActivePath(path);
    document.getElementById(diffElementId(path))?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleViewModeChange(mode: DiffViewMode) {
    setViewMode(mode);
    writeDiffViewMode(mode);
    setOptionsOpen(false);
  }

  return (
    <div className="revision-diff">
      <div className="head no-autofocus d-flex align-items-center flex-nowrap">
        <span className="btn-group mr-3">
          <a
            ref={optionsRef}
            href="#"
            className={`btn btn-light btn-icon btn-lg flex-shrink-0${optionsOpen ? " active" : ""}`}
            title="Diff options"
            onClick={(e) => {
              e.preventDefault();
              setOptionsOpen((v) => !v);
            }}
          >
            <Icon name="gear" />
          </a>
          <a
            href={patchUrl}
            className="btn btn-light btn-icon btn-lg flex-shrink-0"
            title="Download patch"
            download="changes.patch"
          >
            <Icon name="download" />
          </a>
        </span>

        <DropdownMenu
          isOpen={optionsOpen}
          onClose={() => setOptionsOpen(false)}
          triggerRef={optionsRef}
          panelClassName="diff-options-menu p-2"
        >
          {VIEW_MODE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dropdown-item border-0 bg-transparent text-left w-100${viewMode === opt.value ? " active" : ""}`}
              onClick={() => handleViewModeChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
          <div className="dropdown-divider my-1" />
          {WHITESPACE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dropdown-item border-0 bg-transparent text-left w-100${whitespaceOption === opt.value ? " active" : ""}`}
              onClick={() => {
                onWhitespaceOptionChange(opt.value);
                setOptionsOpen(false);
              }}
            >
              {opt.label}
            </button>
          ))}
        </DropdownMenu>

        <div className="path-filter flex-grow-1">
          <form onSubmit={handleFilterSubmit}>
            <div className="clearable-wrapper">
              <div className="input-group">
                <input
                  className="form-control"
                  spellCheck={false}
                  autoComplete="off"
                  placeholder="Filter by path"
                  value={draftFilter}
                  onChange={(e) => setDraftFilter(e.target.value)}
                />
                <span className="input-group-append">
                  <button
                    className="btn btn-icon btn-outline-secondary"
                    type="submit"
                    title="Filter"
                  >
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </div>
          </form>
        </div>

        <button
          type="button"
          className={`btn btn-icon btn-light btn-active-primary ml-3${navigationOpen ? " active" : ""}`}
          title="Toggle navigation"
          onClick={() => setNavigationOpen((v) => !v)}
        >
          <Icon name="sidebar" className="flip-x" />
        </button>
      </div>

      <div className="body">
        {loading && (
          <div className="text-center text-muted py-5">Loading file changes…</div>
        )}

        {!loading && diffs.length > 0 && (
          <div className="d-flex align-items-center mb-4 text-muted font-size-sm">
            <span className="mr-3">{diffs.length} files changed</span>
            <span className="text-success mr-3">+{totalAdditions}</span>
            <span className="text-danger">-{totalDeletions}</span>
            {comments.length > 0 && (
              <span className="ml-3">
                <Icon name="comment" className="icon mr-1" width={14} height={14} />
                {comments.length} code comment{comments.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        )}

        {!loading && diffs.length === 0 && (
          <div className="alert alert-notice alert-light-warning flex-grow-1 mb-0">
            No diffs
          </div>
        )}

        {!loading && diffs.length > 0 && (
          <div className="detail d-flex align-items-stretch">
            {activeComment && (
              <CommentSidePanel
                comment={activeComment}
                projectPath={projectPath}
                rightRevisionLabel={rightRevisionLabel}
                onClose={() => onCommentSelect(null)}
                onLocate={() => scrollToPath(activeComment.mark.path)}
              />
            )}

            <ul className="diffs list-unstyled flex-grow-1 mb-0">
              {diffs.map((file) => {
                const fileComments = commentsByPath.get(file.path) ?? [];
                return (
                  <li key={file.path} id={diffElementId(file.path)} className="diff mb-4">
                    <div className="d-flex align-items-center mb-2 flex-wrap">
                      <code className="text-primary font-weight-bold">{file.path}</code>
                      {fileComments.length > 0 && (
                        <span className="ml-2">
                          {fileComments.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              className={`btn btn-xs btn-light mr-1${activeCommentId === c.id ? " btn-primary" : ""}`}
                              title={c.content}
                              onClick={() => onCommentSelect(c.id)}
                            >
                              <Icon name="comment" className="icon mr-1" width={12} height={12} />
                              #{c.id}
                            </button>
                          ))}
                        </span>
                      )}
                      <span className="ml-auto text-nowrap font-size-sm">
                        <span className="text-success mr-2">+{file.additions}</span>
                        <span className="text-danger">-{file.deletions}</span>
                      </span>
                    </div>
                    {viewMode === "SPLIT" ? (
                      <SplitDiffBody diff={file.diff} />
                    ) : (
                      <pre
                        className="bg-light p-3 font-size-xs mb-0"
                        style={{
                          maxHeight: 600,
                          overflow: "auto",
                          whiteSpace: "pre",
                          fontFamily: "monospace",
                          lineHeight: 1.5,
                        }}
                      >
                        <code>{file.diff}</code>
                      </pre>
                    )}
                  </li>
                );
              })}
            </ul>

            {navigationOpen && (
              <div className="navigation need-width border border-left-0 rounded d-flex overflow-hidden flex-shrink-0 position-sticky ml-3">
                <div className="content flex-grow-1 overflow-auto p-3">
                  {navTree.length > 0 ? (
                    <NavTree nodes={navTree} activePath={activePath} onSelect={scrollToPath} />
                  ) : (
                    <span className="text-muted font-size-sm">No diffs to navigate</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
