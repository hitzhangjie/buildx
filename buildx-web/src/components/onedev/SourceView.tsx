import { useCallback, useEffect, useRef, useState } from "react";
import { Compartment, EditorState, StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  drawSelection,
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
import type { CodeComment } from "../../api/codeComments";
import "./SourceView.css";

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

type SourceViewProps = {
  filePath: string;
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
  onOpenComment?: (comment: CodeComment) => void;
  savingComment?: boolean;
};

export function SourceView({
  filePath,
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
  onOpenComment,
  savingComment,
}: SourceViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());
  const [popover, setPopover] = useState<{
    position: { top: number; left: number };
    range: PlanarRange;
    url: string;
  } | null>(null);
  const lastRangeKey = useRef<string>("");

  const closePopover = useCallback(() => setPopover(null), []);

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

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const isDark = document.documentElement.classList.contains("dark-mode");
    const state = EditorState.create({
      doc: content,
      extensions: [
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
            setTimeout(() => {
              showPopoverForSelection(view, { top: event.clientY, left: event.clientX });
            }, 100);
            return false;
          },
          keyup(event, view) {
            if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
              setTimeout(() => {
                const coords = view.coordsAtPos(view.state.selection.main.head);
                if (coords) {
                  showPopoverForSelection(view, {
                    top: coords.top,
                    left: (coords.left + coords.right) / 2,
                  });
                }
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

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath]);

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
    const mark = draftRange ?? position ?? null;
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
  }, [position, draftRange, content]);

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

  const showCommentPanel = Boolean(draftRange && onSaveComment && onCancelComment);

  return (
    <div className="source-view flex-grow-1 d-flex">
      {showCommentPanel && (
        <div className="comment need-width d-flex overflow-hidden flex-shrink-0">
          <div className="content flex-grow-1 overflow-hidden d-flex flex-column" style={{ width: 360 }}>
            <div className="head d-flex align-items-center px-3 py-2 flex-shrink-0 border-bottom">
              <h6 className="mr-2 mb-0">Code Comment</h6>
              <button
                type="button"
                className="ml-auto btn btn-icon btn-xs btn-light border-0"
                title="Hide comment"
                onClick={onCancelComment}
              >
                <Icon name="times" width={14} height={14} />
              </button>
            </div>
            <div className="body overflow-auto flex-grow-1 p-3">
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
          </div>
          <div className="ui-resizable-handle ui-resizable-e flex-shrink-0" />
        </div>
      )}

      <div className="code flex-grow-1 autofit overflow-hidden d-flex flex-column resize-aware">
        <div ref={containerRef} className="flex-grow-1" style={{ minHeight: 0 }} />
        {comments.length > 0 && (
          <div className="px-3 py-2 border-top font-size-sm">
            {comments.map((comment) => (
              <button
                key={comment.id}
                type="button"
                className="btn btn-link btn-sm p-0 mr-3"
                onClick={() => onOpenComment?.(comment)}
              >
                <Icon name="comment" className="icon mr-1" width={14} height={14} />
                #{comment.id}
              </button>
            ))}
          </div>
        )}
      </div>

      {popover && (
        <SelectionPopover position={popover.position} actions={popoverActions} onClose={closePopover} />
      )}
    </div>
  );
}
