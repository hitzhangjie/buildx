import { useEffect, useRef } from "react";
import { Compartment, EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLine, highlightSpecialChars, drawSelection, highlightActiveLineGutter } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { indentOnInput, bracketMatching, foldGutter, foldKeymap } from "@codemirror/language";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { lintKeymap } from "@codemirror/lint";
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

/**
 * Detect language extension from file path extension.
 * Matches OneDev's mode-by-filename behavior.
 */
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

type CodeEditorProps = {
  value: string;
  onChange?: (value: string) => void;
  filePath?: string;
  readOnly?: boolean;
};

/**
 * CodeEditor — CodeMirror 6 wrapper matching OneDev's SourceEditPanel editor.
 * Uses CodeMirror 6 (OneDev uses CodeMirror 5), with equivalent features:
 * line numbers, syntax highlighting, bracket matching, fold gutter,
 * active line highlight, dark mode support.
 */
export function CodeEditor({ value, onChange, filePath, readOnly }: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const readOnlyCompartment = useRef(new Compartment());

  useEffect(() => {
    if (!containerRef.current) return;

    const langExts = langExtensionForPath(filePath);
    const isDark = document.documentElement.classList.contains("dark-mode");

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && onChange) {
        onChange(update.state.doc.toString());
      }
    });

    const state = EditorState.create({
      doc: value,
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
        autocompletion(),
        highlightSelectionMatches(),
        highlightActiveLine(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
        ]),
        ...langExts,
        updateListener,
        EditorView.lineWrapping,
        readOnlyCompartment.current.of(EditorState.readOnly.of(readOnly ?? false)),
        ...(isDark ? [oneDark] : []),
      ],
    });

    const view = new EditorView({
      state,
      parent: containerRef.current,
    });

    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Only initialize once per mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external value changes into the editor
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (value !== current) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Sync readOnly changes via compartment
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: readOnlyCompartment.current.reconfigure(
        EditorState.readOnly.of(readOnly ?? false),
      ),
    });
  }, [readOnly]);

  return (
    <div
      ref={containerRef}
      className="code-editor code flex-grow-1 autofit overflow-hidden resize-aware"
    />
  );
}
