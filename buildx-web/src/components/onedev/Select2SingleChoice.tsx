import { useEffect, useId, useRef, useState } from "react";

type Select2SingleChoiceProps = {
  value: string;
  onChange: (value: string) => void;
  choices: string[];
  placeholder?: string;
  allowClear?: boolean;
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
}: Select2SingleChoiceProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const display = value || placeholder;
  const isPlaceholder = !value;

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
              <input type="text" autoComplete="off" className="select2-input" tabIndex={-1} readOnly />
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
                    }}
                  >
                    {placeholder}
                  </div>
                </li>
              ) : null}
              {choices.map((choice) => (
                <li
                  key={choice}
                  className={`select2-results-dept-0 select2-result-selectable${choice === value ? " select2-highlighted" : ""}`}
                  role="option"
                >
                  <div
                    className="select2-result-label"
                    onClick={() => {
                      onChange(choice);
                      setOpen(false);
                    }}
                  >
                    {choice}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
