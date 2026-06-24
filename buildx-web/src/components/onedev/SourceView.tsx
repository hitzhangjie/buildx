import { useCallback, useEffect, useRef, useState } from "react";
import { Compartment, EditorState, RangeSet, StateEffect, StateField, type Text } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  GutterMarker,
  drawSelection,
  gutter,
  highlightActiveLine,
  highlightActiveLineGutter,
  highlightSpecialChars,
  keymap,
  lineNumbers,
  type DecorationSet,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { bracketMatching, foldGutter, foldKeymap, indentOnInput } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { oneDark } from "@codemirror/theme-one-dark";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { markdown } from "@codemirror/lang-markdown";
import { python } from "@codemirror/lang-python";
import { yaml } from "@codemirror/lang-yaml";
import { go } from "@codemirror/lang-go";
import { xml } from "@codemirror/lang-xml";
import { sql } from "@codemirror/lang-sql";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { Icon } from "./Icon";
import { SelectionPopover, type SelectionPopoverAction } from "./SelectionPopover";
import {
  type PlanarRange,
  rangeFromSelection,
  rangeToPositions,
  sourcePositionFromRange,
} from "../../util/planarRange";
import type { CodeComment, CodeCommentReply } from "../../api/codeComments";
import { formatWhen } from "../../util/time";
import "./SourceView.css";

function commentMatchesMark(
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

function langExtensionForPath(filePath: string | undefined) {
  if (!filePath) return [];
  const ext = filePath.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "js":
    case "jsx":
    case "ts":
    case "tsx":
    case "mjs":
    case "cjs":
      return [javascript()];
    case "json":
      return [json()];
    case "css":
    case "scss":
    case "less":
      return [css()];
    case "html":
    case "htm":
      return [html()];
    case "md":
    case "markdown":
      return [markdown()];
    case "py":
      return [python()];
    case "yml":
    case "yaml":
      return [yaml()];
    case "go":
      return [go()];
    case "xml":
    case "svg":
      return [xml()];
    case "sql":
      return [sql()];
    case "rs":
      return [rust()];
    case "java":
      return [java()];
    default:
      return [];
  }
}

const setMarkEffect = StateEffect.define<PlanarRange | null>();

const markField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setMarkEffect)) {
        if (!effect.value) {
          return Decoration.none;
        }
        const { from, to } = rangeToPositions(tr.state.doc, effect.value);
        return Decoration.set([
          Decoration.mark({ class: "cm-selection-highlight" }).range(from, to),
        ]);
      }
    }
    return deco;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const setCommentGutterEffect = StateEffect.define<RangeSet<GutterMarker>>();

const commentGutterMarkersField = StateField.define<RangeSet<GutterMarker>>({
  create() {
    return RangeSet.empty;
  },
  update(markers, tr) {
    markers = markers.map(tr.changes);
    for (const effect of tr.effects) {
      if (effect.is(setCommentGutterEffect)) {
        return effect.value;
      }
    }
    return markers;
  },
});

const commentGutter = gutter({
  class: "cm-comment-gutter",
  markers: (view) => view.state.field(commentGutterMarkersField),
});

class CommentGutterMarker extends GutterMarker {
  constructor(
    private readonly commentId: number,
    private readonly active: boolean,
    private readonly onClick: () => void,
  ) {
    super();
  }

  eq(other: GutterMarker) {
    return (
      other instanceof CommentGutterMarker &&
      other.commentId === this.commentId &&
      other.active === this.active
    );
  }

  toDOM() {
    const btn = document.createElement("button");
    btn.type = "button";
    const classes = ["comment-indicator", "comment-trigger", "cm-comment-gutter-marker"];
    if (this.active) {
      classes.push("active");
    }
    btn.className = classes.join(" ");
    btn.title = "Show comment";
    const icon = document.createElement("img");
    icon.src = "/~icon/comment.svg";
    icon.alt = "";
    icon.width = 14;
    icon.height = 14;
    icon.className = "icon";
    btn.appendChild(icon);
    btn.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    btn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.onClick();
    });
    return btn;
  }
}

function buildCommentGutterMarkers(
  doc: Text,
  comments: CodeComment[],
  commitHash: string | undefined,
  filePath: string,
  activeCommentId: number | null,
  panelVisible: boolean,
  onCommentClick: (comment: CodeComment) => void,
): RangeSet<GutterMarker> {
  const markers: { from: number; to: number; value: GutterMarker }[] = [];
  for (const comment of comments) {
    if (!comment.mark.range) {
      continue;
    }
    if (commitHash && !commentMatchesMark(comment, commitHash, filePath)) {
      continue;
    }
    const lineNumber = comment.mark.range.fromRow + 1;
    if (lineNumber < 1 || lineNumber > doc.lines) {
      continue;
    }
    const from = doc.line(lineNumber).from;
    markers.push({
      from,
      to: from,
      value: new CommentGutterMarker(
        comment.id,
        activeCommentId === comment.id && panelVisible,
        () => onCommentClick(comment),
      ),
    });
  }
  return RangeSet.of(markers, true);
}

type SourceViewProps = {
  filePath: string;
  commitHash?: string;
  content: string;
  position?: PlanarRange | null;
  selectionUrl: (range: PlanarRange) => string;
  loggedIn: boolean;
  loginHref: string;
  comments?: CodeComment[];
  draftRange?: PlanarRange | null;
  draftContent?: string;
  onDraftContentChange?: (value: string) => void;
  onAddComment?: (range: PlanarRange) => void;
  onSaveComment?: () => void;
  onCancelComment?: () => void;
  onHideCommentPanel?: () => void;
  onOpenComment?: (comment: CodeComment) => void;
  savingComment?: boolean;
  activeComment?: CodeComment | null;
  commentPanelVisible?: boolean;
  replies?: CodeCommentReply[];
  loadingReplies?: boolean;
  replying?: boolean;
  replyDraft?: string;
  savingReply?: boolean;
  updatingComment?: boolean;
  onReplyDraftChange?: (value: string) => void;
  onStartReply?: () => void;
  onCancelReply?: () => void;
  onCreateReply?: () => void;
  onToggleResolved?: () => void;
  onDeleteComment?: () => void;
};

export function SourceView({
  filePath,
  commitHash,
  content,
  position,
  selectionUrl,
  loggedIn,
  loginHref,
  comments = [],
  draftRange,
  draftContent = "",
  onDraftContentChange,
  onAddComment,
  onSaveComment,
  onCancelComment,
  onHideCommentPanel,
  onOpenComment,
  savingComment,
  activeComment,
  commentPanelVisible = true,
  replies = [],
  loadingReplies,
  replying,
  replyDraft = "",
  savingReply,
  updatingComment,
  onReplyDraftChange,
  onStartReply,
  onCancelReply,
  onCreateReply,
  onToggleResolved,
  onDeleteComment,
}: SourceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());
  const onOpenCommentRef = useRef(onOpenComment);
  onOpenCommentRef.current = onOpenComment;
  const [editorEpoch, setEditorEpoch] = useState(0);
  const [popover, setPopover] = useState<{
    position: { top: number; left: number };
    range: PlanarRange;
    url: string;
  } | null>(null);
  const lastRangeKey = useRef<string>("");
  const isMouseSelecting = useRef(false);

  const closePopover = useCallback(() => setPopover(null), []);

  const handleCommentGutterClick = useCallback((comment: CodeComment) => {
    onOpenCommentRef.current?.(comment);
  }, []);

  const isSelectionInsideEditor = useCallback((view: EditorView) => {
    const sel = document.getSelection();
    if (!sel || sel.rangeCount === 0) {
      return false;
    }
    const editorRoot = view.dom;
    const anchorNode = sel.anchorNode;
    const focusNode = sel.focusNode;
    return Boolean(
      anchorNode &&
        focusNode &&
        editorRoot.contains(anchorNode instanceof Element ? anchorNode : anchorNode.parentElement) &&
        editorRoot.contains(focusNode instanceof Element ? focusNode : focusNode.parentElement),
    );
  }, []);

  const copySelection = useCallback(async (range: PlanarRange) => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const { from, to } = rangeToPositions(view.state.doc, range);
    const text = view.state.sliceDoc(from, to);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    closePopover();
  }, [closePopover]);

  const showPopoverForSelection = useCallback(
    (view: EditorView, mouse: { top: number; left: number }) => {
      const { anchor, head } = view.state.selection.main;
      const range = rangeFromSelection(view.state.doc, anchor, head);
      if (!range) {
        closePopover();
        return;
      }
      const key = sourcePositionFromRange(range);
      if (key === lastRangeKey.current && popover) {
        return;
      }
      lastRangeKey.current = key;
      setPopover({
        position: mouse,
        range,
        url: selectionUrl(range),
      });
    },
    [closePopover, popover, selectionUrl],
  );

  const updatePopoverFromCurrentSelection = useCallback(
    (view: EditorView, fallbackMouse?: { top: number; left: number }) => {
      if (!isSelectionInsideEditor(view)) {
        closePopover();
        return;
      }
      const { anchor, head } = view.state.selection.main;
      const range = rangeFromSelection(view.state.doc, anchor, head);
      if (!range) {
        closePopover();
        return;
      }
      const anchorCoords = view.coordsAtPos(anchor);
      const headCoords = view.coordsAtPos(head);
      const top =
        fallbackMouse?.top ??
        Math.min(anchorCoords?.top ?? Number.POSITIVE_INFINITY, headCoords?.top ?? Number.POSITIVE_INFINITY);
      const left =
        fallbackMouse?.left ??
        ((anchorCoords && headCoords
          ? Math.min(anchorCoords.left, headCoords.left) + Math.abs(anchorCoords.left - headCoords.left) / 2
          : (anchorCoords?.left ?? headCoords?.left)) ?? 0);
      showPopoverForSelection(view, { top: Number.isFinite(top) ? top : 0, left });
    },
    [closePopover, isSelectionInsideEditor, showPopoverForSelection],
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const isDark = document.documentElement.classList.contains("dark-mode");
    const state = EditorState.create({
      doc: content,
      extensions: [
        commentGutterMarkersField,
        commentGutter,
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        foldGutter(),
        drawSelection(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightSelectionMatches(),
        highlightActiveLine(),
        markField,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
        ]),
        ...langExtensionForPath(filePath),
        EditorView.lineWrapping,
        readOnlyCompartment.current.of(EditorState.readOnly.of(true)),
        EditorView.domEventHandlers({
          mouseup(event, view) {
            const target = event.target;
            if (!(target instanceof Node) || !view.dom.contains(target)) {
              closePopover();
              return false;
            }
            setTimeout(() => {
              updatePopoverFromCurrentSelection(view, { top: event.clientY, left: event.clientX });
            }, 100);
            return false;
          },
          keyup(event, view) {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              setTimeout(() => {
                updatePopoverFromCurrentSelection(view);
              }, 100);
            }
            return false;
          },
        }),
        ...(isDark ? [oneDark] : []),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;
    setEditorEpoch((epoch) => epoch + 1);
    const onDocumentMouseDown = () => {
      isMouseSelecting.current = true;
    };
    const onDocumentMouseUp = (event: MouseEvent) => {
      isMouseSelecting.current = false;
      // Mouse can be released outside editor during drag-select; still update popover.
      setTimeout(() => {
        const target = event.target;
        if (!(target instanceof Node) || !view.dom.contains(target)) {
          closePopover();
          return;
        }
        updatePopoverFromCurrentSelection(view, { top: event.clientY, left: event.clientX });
      }, 100);
    };
    const onSelectionChange = () => {
      // Ignore transient selection updates while user is still dragging.
      if (isMouseSelecting.current) {
        return;
      }
      if (!isSelectionInsideEditor(view)) {
        closePopover();
        return;
      }
      // Keep popover state synced for keyboard/native selection changes.
      setTimeout(() => {
        updatePopoverFromCurrentSelection(view);
      }, 0);
    };
    document.addEventListener("mousedown", onDocumentMouseDown);
    document.addEventListener("mouseup", onDocumentMouseUp);
    document.addEventListener("selectionchange", onSelectionChange);

    return () => {
      document.removeEventListener("mousedown", onDocumentMouseDown);
      document.removeEventListener("mouseup", onDocumentMouseUp);
      document.removeEventListener("selectionchange", onSelectionChange);
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closePopover, filePath, isSelectionInsideEditor, updatePopoverFromCurrentSelection]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const current = view.state.doc.toString();
    if (content !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: content },
      });
    }
  }, [content]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const mark = draftRange ?? (commentPanelVisible ? position ?? null : null);
    view.dispatch({
      effects: setMarkEffect.of(mark),
      selection: mark
        ? (() => {
            const { from, to } = rangeToPositions(view.state.doc, mark);
            return { anchor: from, head: to };
          })()
        : undefined,
      scrollIntoView: true,
    });
  }, [position, draftRange, content, commentPanelVisible]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) {
      return;
    }
    const markers = buildCommentGutterMarkers(
      view.state.doc,
      comments,
      commitHash,
      filePath,
      activeComment?.id ?? null,
      commentPanelVisible,
      handleCommentGutterClick,
    );
    view.dispatch({ effects: setCommentGutterEffect.of(markers) });
  }, [comments, commitHash, filePath, activeComment?.id, commentPanelVisible, handleCommentGutterClick, content, editorEpoch]);

  const popoverActions: SelectionPopoverAction[] = popover
    ? [
        {
          key: "permanent",
          label: "Permanent link of this selection",
          icon: "link",
          href: popover.url,
        },
        {
          key: "copy",
          label: "Copy selected text to clipboard",
          icon: "copy",
          onClick: () => void copySelection(popover.range),
        },
        loggedIn
          ? {
              key: "comment",
              label: "Add comment on this selection",
              icon: "comment",
              onClick: () => {
                closePopover();
                onAddComment?.(popover.range);
              },
            }
          : {
              key: "comment",
              label: "Login to comment on selection",
              icon: "warning",
              href: loginHref,
            },
      ]
    : [];

  const showCommentComposer = Boolean(draftRange && onSaveComment && onCancelComment && !activeComment);
  const showThreadPanel = Boolean(activeComment);
  const hasCommentPanelContent = showCommentComposer || showThreadPanel;
  const showCommentPanel = commentPanelVisible && hasCommentPanelContent;

  useEffect(() => {
    if (showCommentPanel) {
      window.dispatchEvent(new Event("resize"));
    }
  }, [showCommentPanel]);

  return (
    <div className="source-view flex-grow-1 d-flex">
      {showCommentPanel && (
        <div className="source-comment-panel need-width d-flex overflow-hidden flex-shrink-0">
          <div className="source-comment-panel-content flex-grow-1 overflow-hidden d-flex flex-column" style={{ width: 360 }}>
            <div className="source-comment-panel-head d-flex align-items-center px-3 py-2 flex-shrink-0 border-bottom">
              <h6 className="mr-2 mb-0">Code Comment</h6>
              <button
                type="button"
                className="ml-auto btn btn-icon btn-xs btn-light border-0"
                title={showThreadPanel ? "Hide comment" : "Cancel"}
                onClick={() => (showThreadPanel ? onHideCommentPanel?.() : onCancelComment?.())}
              >
                <Icon name="times" width={14} height={14} />
              </button>
            </div>
            {showCommentComposer && (
              <div className="source-comment-panel-body overflow-auto flex-grow-1 p-3">
                <form
                  className="new-comment leave-confirm"
                  onSubmit={(e) => {
                    e.preventDefault();
                    onSaveComment?.();
                  }}
                >
                  <div className="form-group mb-3">
                    <textarea
                      className="form-control font-size-sm"
                      rows={8}
                      value={draftContent}
                      onChange={(e) => onDraftContentChange?.(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    className="btn btn-sm btn-primary dirty-aware mr-1"
                    disabled={savingComment || !draftContent.trim()}
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={onCancelComment}
                    disabled={savingComment}
                  >
                    Cancel
                  </button>
                </form>
              </div>
            )}
            {showThreadPanel && activeComment && (
              <div className="source-comment-panel-body overflow-auto flex-grow-1 p-3 font-size-sm">
                <div className="code-comment-thread-item mb-3">
                  <div className="d-flex">
                    <div className="source-comment-avatar flex-shrink-0 mr-2">
                      {(activeComment.user?.name?.[0] ?? "U").toUpperCase()}
                    </div>
                    <div className="min-width-0 flex-grow-1">
                      <div className="text-muted mb-2">
                        <span className="font-weight-bold">{activeComment.user?.name ?? "Unknown"}</span>
                        <span className="ml-1">commented {formatWhen(new Date(activeComment.createDate).getTime())}</span>
                      </div>
                      <div className="mb-2 pre-wrap">{activeComment.content}</div>
                      <div className="source-comment-inline-actions mb-2">
                        <button type="button" className="btn btn-link btn-sm p-0 mr-2" onClick={(e) => e.preventDefault()}>
                          Edit
                        </button>
                        <button type="button" className="btn btn-link btn-sm p-0" onClick={(e) => e.preventDefault()}>
                          Quote
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                {loadingReplies ? (
                  <div className="text-muted mb-3">Loading replies...</div>
                ) : (
                  replies.map((reply) => (
                    <div key={reply.id} className="code-comment-thread-item mb-3">
                      <div className="d-flex">
                        <div className="source-comment-avatar flex-shrink-0 mr-2">
                          {(reply.user?.name?.[0] ?? "U").toUpperCase()}
                        </div>
                        <div className="min-width-0 flex-grow-1">
                          <div className="text-muted mb-1">
                            <span className="font-weight-bold">{reply.user?.name ?? "Unknown"}</span>
                            <span className="ml-1">replied {formatWhen(new Date(reply.createDate).getTime())}</span>
                          </div>
                          <div className="pre-wrap">{reply.content}</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {replying && (
                  <form
                    className="new-comment leave-confirm mb-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      onCreateReply?.();
                    }}
                  >
                    <div className="form-group mb-2">
                      <textarea
                        className="form-control font-size-sm"
                        rows={5}
                        value={replyDraft}
                        onChange={(e) => onReplyDraftChange?.(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <button
                      type="submit"
                      className="btn btn-sm btn-primary mr-1"
                      disabled={savingReply || !replyDraft.trim()}
                    >
                      Reply
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={onCancelReply}
                      disabled={savingReply}
                    >
                      Cancel
                    </button>
                  </form>
                )}
                <div className="d-flex align-items-center flex-wrap">
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary mr-2 mb-2"
                    onClick={onStartReply}
                    disabled={replying || savingReply || updatingComment}
                  >
                    Reply
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary mr-2 mb-2"
                    onClick={onToggleResolved}
                    disabled={savingReply || updatingComment}
                  >
                    {activeComment.resolved ? "Set Unresolved" : "Set Resolved"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger mb-2 ml-auto"
                    onClick={onDeleteComment}
                    disabled={savingReply || updatingComment}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="ui-resizable-handle ui-resizable-e flex-shrink-0" />
        </div>
      )}

      <div className="code flex-grow-1 autofit overflow-hidden d-flex flex-column resize-aware">
        <div ref={containerRef} className="flex-grow-1" style={{ minHeight: 0 }} />
      </div>

      {popover && (
        <SelectionPopover position={popover.position} actions={popoverActions} onClose={closePopover} />
      )}
    </div>
  );
}
