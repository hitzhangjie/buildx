import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { searchText, searchFileNames, type SearchFileHit, type SearchTextHit, type TextSearchParams } from "../../api/search";
import { Icon } from "../onedev/Icon";
import "./advanced-search.css";

export type AdvancedSearchPanelProps = {
  isOpen: boolean;
  projectPath: string;
  revision: string;
  currentPath: string;
  onClose: () => void;
  onSearchComplete: (hits: SearchTextHit[] | SearchFileHit[], type: "text" | "file", hasMore: boolean) => void;
};

type Tab = "text" | "files" | "symbols";

export function AdvancedSearchPanel({
  isOpen,
  projectPath,
  revision,
  currentPath,
  onClose,
  onSearchComplete,
}: AdvancedSearchPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("text");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Text tab state.
  const [searchFor, setSearchFor] = useState("");
  const [regex, setRegex] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [filePatterns, setFilePatterns] = useState("");

  // Files tab state.
  const [fileNameQuery, setFileNameQuery] = useState("");
  const [fileCaseSensitive, setFileCaseSensitive] = useState(false);

  // Search inside current tree.
  const [insideCurrentDir, setInsideCurrentDir] = useState(false);

  const searchForRef = useRef<HTMLInputElement>(null);
  const fileNameRef = useRef<HTMLInputElement>(null);

  // Focus the active tab's input on open.
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (activeTab === "text") searchForRef.current?.focus();
        else if (activeTab === "files") fileNameRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen, activeTab]);

  // Reset on close.
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setLoading(false);
    }
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSearch = async () => {
    setError(null);
    setLoading(true);

    const directory = insideCurrentDir && currentPath ? currentPath : undefined;

    try {
      if (activeTab === "text") {
        if (!searchFor.trim()) {
          setError("Please enter a search term.");
          setLoading(false);
          return;
        }
        const params: TextSearchParams = {
          query: searchFor,
          regex,
          wholeWord,
          caseSensitive,
          fileNames: filePatterns || undefined,
        };
        const result = await searchText(projectPath, revision, params, directory);
        onSearchComplete(result.hits, "text", result.hasMore);
      } else if (activeTab === "files") {
        if (!fileNameQuery.trim()) {
          setError("Please enter a file name pattern.");
          setLoading(false);
          return;
        }
        const result = await searchFileNames(projectPath, revision, fileNameQuery, fileCaseSensitive, directory);
        onSearchComplete(result.hits, "file", result.hasMore);
      }
      onClose();
    } catch (err) {
      setError((err as { message?: string }).message ?? "Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-backdrop show" style={{ background: "rgba(0,0,0,0.85)" }} onClick={handleBackdropClick}>
      <div className="modal show d-block" tabIndex={-1} role="dialog">
        <form
          className="advanced-search"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
        >
          <div className="modal-header">
            <h5 className="modal-title">
              Advanced Search{" "}
              <span className="text-muted font-size-sm">in current commit</span>
            </h5>
            <button type="button" className="close" onClick={onClose} aria-label="Close">
              <Icon name="times" />
            </button>
          </div>

          <div className="modal-body">
            {/* Tabs */}
            <ul className="nav nav-tabs nav-tabs-line nav-bold">
              <li className="nav-item">
                <a
                  className={`nav-link${activeTab === "text" ? " active" : ""}`}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setActiveTab("text"); }}
                >
                  Text
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link${activeTab === "files" ? " active" : ""}`}
                  href="#"
                  onClick={(e) => { e.preventDefault(); setActiveTab("files"); }}
                >
                  Files
                </a>
              </li>
              <li className="nav-item">
                <a
                  className="nav-link disabled"
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  title="Symbol search coming soon"
                >
                  Symbols
                </a>
              </li>
            </ul>

            {/* Error */}
            {error && (
              <div className="alert alert-light-danger py-2 px-3 mb-3">{error}</div>
            )}

            {/* Text tab */}
            {activeTab === "text" && (
              <div className="option">
                <div className="form-group">
                  <label className="font-weight-bold">Search For</label>
                  <input
                    ref={searchForRef}
                    type="text"
                    className="form-control"
                    value={searchFor}
                    onChange={(e) => setSearchFor(e.target.value)}
                    placeholder="Enter search term…"
                  />
                </div>
                <div className="form-group">
                  <label className="checkbox mr-3">
                    <input type="checkbox" checked={regex} onChange={(e) => setRegex(e.target.checked)} />{" "}
                    Regular Expression
                  </label>
                  <label className="checkbox mr-3">
                    <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />{" "}
                    Whole Word
                  </label>
                  <label className="checkbox">
                    <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />{" "}
                    Case Sensitive
                  </label>
                </div>
                <div className="form-group">
                  <label>File Name Patterns (separated by comma)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={filePatterns}
                    onChange={(e) => setFilePatterns(e.target.value)}
                    placeholder="e.g. *.go, *.ts"
                  />
                </div>
              </div>
            )}

            {/* Files tab */}
            {activeTab === "files" && (
              <div className="option">
                <div className="form-group">
                  <label className="font-weight-bold">File Name</label>
                  <input
                    ref={fileNameRef}
                    type="text"
                    className="form-control"
                    value={fileNameQuery}
                    onChange={(e) => setFileNameQuery(e.target.value)}
                    placeholder="Enter file name…"
                  />
                  <small className="form-text text-muted">* = any string, ? = any character</small>
                </div>
                <div className="form-group">
                  <label className="checkbox">
                    <input type="checkbox" checked={fileCaseSensitive} onChange={(e) => setFileCaseSensitive(e.target.checked)} />{" "}
                    Case Sensitive
                  </label>
                </div>
              </div>
            )}

            {/* Symbols tab — placeholder */}
            {activeTab === "symbols" && (
              <div className="option">
                <div className="alert alert-light-warning">
                  Symbol search requires code indexing infrastructure and will be available in a future update.
                </div>
              </div>
            )}

            {/* Search inside current tree */}
            {currentPath && (
              <div className="form-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={insideCurrentDir}
                    onChange={(e) => setInsideCurrentDir(e.target.checked)}
                  />{" "}
                  Search inside current tree
                </label>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Searching…" : "Search"}
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
