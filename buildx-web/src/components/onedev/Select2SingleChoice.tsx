import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

export type ChoiceOption = { value: string; label: string };

function choiceValue(c: string | ChoiceOption): string {
  return typeof c === "string" ? c : c.value;
}

function choiceLabel(c: string | ChoiceOption): string {
  return typeof c === "string" ? c : c.label;
}

type Select2SingleChoiceProps = {
  value: string;
  onChange: (value: string) => void;
  choices: readonly (string | ChoiceOption)[];
  placeholder?: string;
  allowClear?: boolean;
  /** Enable text search/filter within the dropdown. Default true. */
  filterable?: boolean;
};

/**
 * Select2 v3 single-choice shell (ParentChoiceEditor / StringSingleChoice).
 * Visual parity with OneDev; dropdown is a lightweight native list.
 */
export function Select2SingleChoice({
  value,
  onChange,
  choices,
  placeholder = "",
  allowClear = true,
  filterable = true,
}: Select2SingleChoiceProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Focus search input when dropdown opens.
  useEffect(() => {
    if (open && filterable && searchRef.current) {
      searchRef.current.focus();
    }
  }, [open, filterable]);

  const filtered = filterable
    ? choices.filter((c) =>
        choiceLabel(c).toLowerCase().includes(query.toLowerCase()) ||
        choiceValue(c).toLowerCase().includes(query.toLowerCase()),
      )
    : choices;

  // Compute display label for the currently selected value.
  const selectedOption = choices.find((c) => choiceValue(c) === value);
  const display = value ? (selectedOption ? choiceLabel(selectedOption) : value) : placeholder;
  const isPlaceholder = !value;

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
      return;
    }
    // Select first filtered item on Enter.
    if (e.key === "Enter" && filterable && filtered.length > 0 && query) {
      e.preventDefault();
      const v = choiceValue(filtered[0]);
      onChange(v);
      setQuery("");
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="select2-choice-editor">
      <input type="hidden" className="form-control" value={value} readOnly />
      <div
        className={`select2-container form-control${allowClear && value ? " select2-allowclear" : ""}${open ? " select2-dropdown-open" : ""}`}
      >
        <a
          href="#"
          className={`select2-choice${isPlaceholder ? " select2-default" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            setOpen((v) => !v);
            setQuery("");
          }}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={listId}
        >
          <span className="select2-chosen">{display}</span>
          {allowClear && value ? (
            <abbr
              className="select2-search-choice-close"
              title="Remove"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
                setOpen(false);
                setQuery("");
              }}
            />
          ) : null}
          <span className="select2-arrow" role="presentation">
            <b role="presentation" />
          </span>
        </a>
        {open ? (
          <div className="select2-drop select2-drop-active" style={{ display: "block", width: "100%" }}>
            <div className="select2-search">
              <input
                ref={searchRef}
                type="text"
                autoComplete="off"
                className="select2-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={filterable ? "Search..." : undefined}
                readOnly={!filterable}
                tabIndex={filterable ? 0 : -1}
              />
            </div>
            <ul id={listId} className="select2-results" role="listbox">
              {allowClear && placeholder ? (
                <li
                  className={`select2-results-dept-0 select2-result-selectable${!value ? " select2-highlighted" : ""}`}
                  role="option"
                >
                  <div
                    className="select2-result-label"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {placeholder}
                  </div>
                </li>
              ) : null}
              {filtered.map((choice) => (
                <li
                  key={choiceValue(choice)}
                  className={`select2-results-dept-0 select2-result-selectable${choiceValue(choice) === value ? " select2-highlighted" : ""}`}
                  role="option"
                >
                  <div
                    className="select2-result-label"
                    onClick={() => {
                      onChange(choiceValue(choice));
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    {choiceLabel(choice)}
                  </div>
                </li>
              ))}
              {filtered.length === 0 && query ? (
                <li className="select2-results-dept-0 select2-result-unselectable">
                  <div className="select2-result-label text-muted">No matches</div>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
