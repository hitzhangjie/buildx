import { useState, useEffect, useRef, useCallback } from "react";
import { searchFilesQuick, type SearchFileHit } from "../../api/search";
import { fileIcon } from "../../util/blobPath";
import { Icon } from "../onedev/Icon";
import { SearchModal } from "./SearchModal";
import "./quick-search.css";

export type QuickSearchPanelProps = {
  isOpen: boolean;
  projectPath: string;
  revision: string;
  currentPath: string;
  onClose: () => void;
  onSelectFile: (filePath: string) => void;
  onOpenAdvanced: () => void;
};

export function QuickSearchPanel({
  isOpen,
  projectPath,
  revision,
  currentPath,
  onClose,
  onSelectFile,
  onOpenAdvanced,
}: QuickSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchFileHit[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHits([]);
      setHasMore(false);
      setLoading(false);
      setActiveIndex(0);
    }
  }, [isOpen]);

  const doSearch = useCallback(
    (q: string) => {
      if (!q.trim()) {
        setHits([]);
        setHasMore(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      searchFilesQuick(projectPath, revision, q, currentPath || undefined)
        .then((result) => {
          setHits(result.hits);
          setHasMore(result.hasMore);
          setActiveIndex(0);
        })
        .catch(() => {
          setHits([]);
          setHasMore(false);
        })
        .finally(() => setLoading(false));
    },
    [projectPath, revision, currentPath],
  );

  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(value), 100);
  };

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      const totalItems = hits.length + (hasMore ? 1 : 0);
      if (totalItems === 0) {
        if (e.key === "Escape") onClose();
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => (prev + 1) % totalItems);
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => (prev - 1 + totalItems) % totalItems);
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex < hits.length) {
            onSelectFile(hits[activeIndex].filePath);
            onClose();
          } else if (hasMore && activeIndex === hits.length) {
            onOpenAdvanced();
          }
          break;
        case "Escape":
          e.preventDefault();
          onClose();
          break;
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, hits, hasMore, activeIndex, onClose, onSelectFile, onOpenAdvanced]);

  useEffect(() => {
    if (listRef.current && activeIndex >= 0) {
      const items = listRef.current.querySelectorAll("li.hit");
      if (items[activeIndex]) {
        items[activeIndex].scrollIntoView({ block: "nearest" });
      }
    }
  }, [activeIndex]);

  if (!isOpen) return null;

  const handleSelect = (filePath: string) => {
    onSelectFile(filePath);
    onClose();
  };

  return (
    <SearchModal onClose={onClose}>
      <div className="quick-search">
        <div className="modal-header">
          <h5 className="modal-title">
            File and Symbol Search{" "}
            <span className="text-muted font-size-sm">in current commit</span>
          </h5>
          <button type="button" className="close" onClick={onClose} aria-label="Close">
            <Icon name="times" />
          </button>
        </div>
        <div className="modal-body">
          <input
            ref={inputRef}
            className="form-control"
            placeholder="Search files..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
          />
          <div className="result mt-3 overflow-auto">
            {loading && (
              <div className="text-center text-muted py-2">Searching…</div>
            )}
            {!loading && hits.length === 0 && query.trim() && (
              <div className="no-matches alert alert-notice alert-light-warning">
                No any matches
              </div>
            )}
            {hits.length > 0 && (
              <ul ref={listRef} className="list-unstyled mb-0">
                {hits.map((hit, idx) => (
                  <li
                    key={hit.filePath}
                    className={`hit selectable${idx === activeIndex ? " active" : ""}`}
                  >
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleSelect(hit.filePath);
                      }}
                    >
                      <span className="icon">
                        <img
                          src={`/~icon/${fileIcon(hit.fileName, "file")}.svg`}
                          alt=""
                          width={16}
                          height={16}
                        />
                      </span>
                      <span className="text">{hit.filePath}</span>
                    </a>
                  </li>
                ))}
                {hasMore && (
                  <li
                    className={`hit selectable more-matches${activeIndex === hits.length ? " active" : ""}`}
                  >
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        onOpenAdvanced();
                      }}
                    >
                      <Icon name="hand" /> Show more
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>
        </div>
      </div>
    </SearchModal>
  );
}
