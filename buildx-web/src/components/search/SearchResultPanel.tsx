import { useState, useEffect, useRef, useCallback } from "react";
import { fileIcon } from "../../util/blobPath";
import { Icon } from "../onedev/Icon";
import type { SearchFileHit, SearchTextHit, SearchSymbolHit } from "../../api/search";
import "./search-result.css";

export type SearchResultPanelProps = {
  textHits?: SearchTextHit[];
  fileHits?: SearchFileHit[];
  symbolHits?: SearchSymbolHit[];
  hasMore: boolean;
  searchType: "text" | "file" | "symbol";
  query: string;
  onClose: () => void;
  onNavigateToLine: (filePath: string, lineNo?: number) => void;
};

/** Group text/symbol hits by file path for the grouped display. */
type FileGroup = {
  filePath: string;
  textHits: SearchTextHit[];
  symbolHits: SearchSymbolHit[];
  expanded: boolean;
};

type TextMatch = { filePath: string; textHit: SearchTextHit };
type SymbolMatch = { filePath: string; symbolHit: SearchSymbolHit };
type FlatMatch = TextMatch | SymbolMatch;

export function SearchResultPanel({
  textHits,
  fileHits,
  symbolHits,
  hasMore,
  searchType,
  query: _query,
  onClose,
  onNavigateToLine,
}: SearchResultPanelProps) {
  // Group text/symbol hits by file path.
  const groups: FileGroup[] = (() => {
    if (searchType === "text" && textHits && textHits.length > 0) {
      const map = new Map<string, SearchTextHit[]>();
      for (const hit of textHits) {
        const list = map.get(hit.filePath);
        if (list) list.push(hit);
        else map.set(hit.filePath, [hit]);
      }
      return Array.from(map.entries()).map(([filePath, hits]) => ({
        filePath,
        textHits: hits,
        symbolHits: [],
        expanded: true,
      }));
    }
    if (searchType === "symbol" && symbolHits && symbolHits.length > 0) {
      const map = new Map<string, SearchSymbolHit[]>();
      for (const hit of symbolHits) {
        const list = map.get(hit.filePath);
        if (list) list.push(hit);
        else map.set(hit.filePath, [hit]);
      }
      return Array.from(map.entries()).map(([filePath, hits]) => ({
        filePath,
        textHits: [],
        symbolHits: hits,
        expanded: true,
      }));
    }
    return [];
  })();

  // Flattened list of all matches for prev/next navigation.
  const allMatches: FlatMatch[] = groups.flatMap((g): FlatMatch[] => {
    if (searchType === "symbol") {
      return g.symbolHits.map((h) => ({ filePath: g.filePath, symbolHit: h }));
    }
    return g.textHits.map((h) => ({ filePath: g.filePath, textHit: h }));
  });

  const [activeIndex, setActiveIndex] = useState(-1);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(() => {
    // Start with all expanded.
    return new Set(groups.map((g) => g.filePath));
  });

  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLUListElement>(null);

  // Reset state when results change.
  useEffect(() => {
    setActiveIndex(-1);
    setExpandedFiles(new Set(groups.map((g) => g.filePath)));
  }, [textHits, fileHits, symbolHits]);

  // Navigate to active match.
  const scrollToActive = useCallback(() => {
    if (bodyRef.current) {
      const activeEl = bodyRef.current.querySelector(".selectable.active");
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, []);

  useEffect(() => {
    scrollToActive();
  }, [activeIndex, scrollToActive]);

  const goToPrev = () => {
    if (allMatches.length === 0) return;
    setActiveIndex((prev) => (prev <= 0 ? allMatches.length - 1 : prev - 1));
  };

  const goToNext = () => {
    if (allMatches.length === 0) return;
    setActiveIndex((prev) => (prev >= allMatches.length - 1 ? 0 : prev + 1));
  };

  const toggleExpand = (filePath: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filePath)) next.delete(filePath);
      else next.add(filePath);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedFiles(new Set(groups.map((g) => g.filePath)));
  };

  const collapseAll = () => {
    setExpandedFiles(new Set());
  };

  const handleFileClick = (filePath: string, lineNo?: number) => {
    onNavigateToLine(filePath, lineNo);
  };

  // Resize handling.
  const gripRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(200);

  useEffect(() => {
    const grip = gripRef.current;
    if (!grip) return;

    let startY = 0;
    let startHeight = 0;

    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      startY = e.clientY;
      startHeight = panelHeight;
      document.addEventListener("mousemove", onMouseMove);
      document.addEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "n-resize";
      document.body.style.userSelect = "none";
    };

    const onMouseMove = (e: MouseEvent) => {
      const delta = startY - e.clientY;
      const newHeight = Math.max(100, Math.min(window.innerHeight * 0.5, startHeight + delta));
      setPanelHeight(newHeight);
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    grip.addEventListener("mousedown", onMouseDown);
    return () => grip.removeEventListener("mousedown", onMouseDown);
  }, [panelHeight]);

  const hasResults =
    (searchType === "text" && textHits && textHits.length > 0) ||
    (searchType === "file" && fileHits && fileHits.length > 0) ||
    (searchType === "symbol" && symbolHits && symbolHits.length > 0);

  return (
    <div
      ref={panelRef}
      className="search-result d-flex flex-column overflow-hidden flex-shrink-0"
      style={{ height: panelHeight }}
    >
      {/* Resize grip */}
      <div ref={gripRef} className="ui-resizable-handle" />

      {/* Header */}
      <div className="head d-flex align-items-center px-3 py-2 flex-shrink-0">
        <h6 className="title mr-4 mb-0">Search Result</h6>

        {(searchType === "text" || searchType === "symbol") && allMatches.length > 0 && (
          <div className="actions text-nowrap mr-2">
            <a
              href="#"
              className="mr-1"
              title="Show previous match"
              onClick={(e) => { e.preventDefault(); goToPrev(); }}
            >
              <Icon name="arrow2" className="rotate-270" />
            </a>
            <a
              href="#"
              className="mr-1"
              title="Show next match"
              onClick={(e) => { e.preventDefault(); goToNext(); }}
            >
              <Icon name="arrow2" className="rotate-90" />
            </a>
            <a
              href="#"
              className="mr-2"
              title="Expand all"
              onClick={(e) => { e.preventDefault(); expandAll(); }}
            >
              <Icon name="plus-square" />
            </a>
            <a
              href="#"
              title="Collapse all"
              onClick={(e) => { e.preventDefault(); collapseAll(); }}
            >
              <Icon name="minus-square" />
            </a>
          </div>
        )}

        {hasMore && (
          <div className="warning mr-2 d-none d-md-inline text-muted">
            (too many matches, displaying some of them)
          </div>
        )}

        <div className="ml-auto">
          <a
            href="#"
            className="text-muted text-hover-primary"
            title="Close"
            onClick={(e) => { e.preventDefault(); onClose(); }}
          >
            <Icon name="times" />
          </a>
        </div>
      </div>

      {/* Body */}
      <ul ref={bodyRef} className="body list-unstyled mb-0 px-3 py-2 overflow-auto flex-grow-1">
        {!hasResults && (
          <li className="no-matching-result my-2 alert alert-notice alert-light-warning">
            Nothing matching your query
          </li>
        )}

        {/* Text search results: grouped by file */}
        {searchType === "text" &&
          groups.map((group) => {
            const isExpanded = expandedFiles.has(group.filePath);
            return (
              <li key={group.filePath} className="blob text-nowrap border-0">
                <div className="d-flex align-items-center flex-nowrap">
                  <a
                    href="#"
                    className="expand"
                    onClick={(e) => { e.preventDefault(); toggleExpand(group.filePath); }}
                  >
                    <Icon name={isExpanded ? "minus-square" : "plus-square"} />
                  </a>
                  <a
                    href="#"
                    className="blob selectable d-inline-block flex-grow-1 flex-shrink-1"
                    onClick={(e) => {
                      e.preventDefault();
                      handleFileClick(group.filePath);
                    }}
                  >
                    <img
                      src={`/~icon/${fileIcon(group.filePath.split("/").pop() ?? group.filePath, "file")}.svg`}
                      alt=""
                      className="icon"
                      width={16}
                      height={16}
                    />
                    <span>{group.filePath}</span>
                  </a>
                </div>
                {isExpanded && (
                  <ul className="list-unstyled">
                    {group.textHits.map((hit) => {
                      const globalIdx = allMatches.findIndex(
                        (m): m is TextMatch =>
                          "textHit" in m &&
                          m.filePath === hit.filePath &&
                          m.textHit.lineNo === hit.lineNo,
                      );
                      return (
                        <li
                          key={`${hit.filePath}:${hit.lineNo}`}
                          className={`hit${globalIdx === activeIndex ? " selectable active" : ""}`}
                        >
                          <a
                            href="#"
                            className="hit selectable d-block"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveIndex(globalIdx);
                              handleFileClick(hit.filePath, hit.lineNo);
                            }}
                          >
                            <img
                              src={`/~icon/${fileIcon(hit.filePath.split("/").pop() ?? hit.filePath, "file")}.svg`}
                              alt=""
                              width={16}
                              height={16}
                            />
                            <span className="line-no">{hit.lineNo}:</span>
                            <span>{hit.lineContent}</span>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}

        {/* Symbol search results: grouped by file */}
        {searchType === "symbol" &&
          groups.map((group) => {
            const isExpanded = expandedFiles.has(group.filePath);
            return (
              <li key={group.filePath} className="blob text-nowrap border-0">
                <div className="d-flex align-items-center flex-nowrap">
                  <a
                    href="#"
                    className="expand"
                    onClick={(e) => { e.preventDefault(); toggleExpand(group.filePath); }}
                  >
                    <Icon name={isExpanded ? "minus-square" : "plus-square"} />
                  </a>
                  <a
                    href="#"
                    className="blob selectable d-inline-block flex-grow-1 flex-shrink-1"
                    onClick={(e) => {
                      e.preventDefault();
                      handleFileClick(group.filePath);
                    }}
                  >
                    <img
                      src={`/~icon/${fileIcon(group.filePath.split("/").pop() ?? group.filePath, "file")}.svg`}
                      alt=""
                      className="icon"
                      width={16}
                      height={16}
                    />
                    <span>{group.filePath}</span>
                  </a>
                </div>
                {isExpanded && (
                  <ul className="list-unstyled">
                    {group.symbolHits.map((hit) => {
                      const globalIdx = allMatches.findIndex(
                        (m): m is SymbolMatch =>
                          "symbolHit" in m &&
                          m.filePath === hit.filePath &&
                          m.symbolHit.lineNo === hit.lineNo &&
                          m.symbolHit.symbolName === hit.symbolName,
                      );
                      return (
                        <li
                          key={`${hit.filePath}:${hit.lineNo}:${hit.symbolName}`}
                          className={`hit${globalIdx === activeIndex ? " selectable active" : ""}`}
                        >
                          <a
                            href="#"
                            className="hit selectable d-block"
                            onClick={(e) => {
                              e.preventDefault();
                              setActiveIndex(globalIdx);
                              handleFileClick(hit.filePath, hit.lineNo);
                            }}
                          >
                            <img
                              src={`/~icon/code.svg`}
                              alt=""
                              width={16}
                              height={16}
                            />
                            <span className="line-no">{hit.lineNo}:</span>
                            <span>{hit.symbolName}</span>
                            {hit.namespace && (
                              <span className="scope text-muted">
                                {" "}-- {hit.namespace}
                              </span>
                            )}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}

        {/* File search results: flat list */}
        {searchType === "file" &&
          fileHits?.map((hit) => (
            <li key={hit.filePath} className="blob text-nowrap border-0">
              <div className="d-flex align-items-center flex-nowrap">
                <a
                  href="#"
                  className="blob selectable d-inline-block flex-grow-1 flex-shrink-1"
                  onClick={(e) => {
                    e.preventDefault();
                    handleFileClick(hit.filePath);
                  }}
                >
                  <img
                    src={`/~icon/${fileIcon(hit.fileName, "file")}.svg`}
                    alt=""
                    className="icon"
                    width={16}
                    height={16}
                  />
                  <span>{hit.filePath}</span>
                </a>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );
}
