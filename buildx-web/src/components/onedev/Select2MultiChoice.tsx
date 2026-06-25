import { type KeyboardEvent, useEffect, useId, useRef, useState } from "react";

type Select2MultiChoiceProps = {
  values: string[];
  onChange: (values: string[]) => void;
  choices: string[];
  placeholder?: string;
  /** Show all choices with checkboxes; dropdown stays open while selecting. */
  checkboxList?: boolean;
};

function summaryText(values: string[], placeholder: string): string {
  if (values.length === 0) {
    return placeholder;
  }
  if (values.length <= 2) {
    return values.join(", ");
  }
  return `${values.length} selected`;
}

/**
 * Select2 v3 multi-choice shell (RoleMultiChoice / MultiChoiceEditor).
 */
export function Select2MultiChoice({
  values,
  onChange,
  choices,
  placeholder = "",
  checkboxList = false,
}: Select2MultiChoiceProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = choices.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!checkboxList) {
      return;
    }
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [checkboxList]);

  function addValue(value: string) {
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    if (!checkboxList) {
      setQuery("");
      setOpen(false);
    }
  }

  function removeValue(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function toggleValue(value: string) {
    if (values.includes(value)) {
      removeValue(value);
    } else {
      addValue(value);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && values.length > 0) {
      onChange(values.slice(0, -1));
    }
    if (!checkboxList && e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      addValue(filtered[0]);
    }
  }

  if (checkboxList) {
    const display = summaryText(values, placeholder);
    const isPlaceholder = values.length === 0;

    return (
      <div ref={rootRef} className="select2-checkbox-multi-choice-editor">
        <input type="hidden" className="form-control" value={values.join(",")} readOnly />
        <div
          className={`select2-container form-control${open ? " select2-dropdown-open" : ""}`}
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
            {values.length > 0 ? (
              <abbr
                className="select2-search-choice-close"
                title="Clear"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange([]);
                  setOpen(false);
                }}
              />
            ) : null}
            <span className="select2-arrow" role="presentation">
              <b role="presentation" />
            </span>
          </a>
          {open ? (
            <div
              className="select2-drop select2-drop-active select2-checkbox-drop"
              style={{ display: "block", width: "100%" }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <div className="select2-search">
                <input
                  type="text"
                  autoComplete="off"
                  className="select2-input"
                  placeholder="Search..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <ul id={listId} className="select2-results select2-checkbox-results" role="listbox">
                {filtered.map((choice, index) => {
                  const checked = values.includes(choice);
                  const optionId = `${listId}-opt-${index}`;
                  return (
                    <li
                      key={choice}
                      className={`select2-results-dept-0 select2-result-selectable${
                        checked ? " select2-highlighted" : ""
                      }`}
                      role="option"
                      aria-selected={checked}
                    >
                      <div className="form-check select2-checkbox-option">
                        <input
                          type="checkbox"
                          className="form-check-input"
                          id={optionId}
                          checked={checked}
                          onChange={() => toggleValue(choice)}
                        />
                        <label className="form-check-label" htmlFor={optionId}>
                          {choice}
                        </label>
                      </div>
                    </li>
                  );
                })}
                {filtered.length === 0 ? (
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

  return (
    <div className="select2-multi-choice-editor">
      <input type="hidden" className="form-control" value={values.join(",")} readOnly />
      <div
        className={`select2-container select2-container-multi form-control${open ? " select2-dropdown-open" : ""}`}
      >
        <ul className="select2-choices">
          {values.map((value) => (
            <li key={value} className="select2-search-choice">
              <div>{value}</div>
              <button
                type="button"
                className="select2-search-choice-close"
                tabIndex={-1}
                onClick={() => removeValue(value)}
              />
            </li>
          ))}
          <li className="select2-search-field">
            <input
              type="text"
              autoComplete="off"
              className="select2-input"
              placeholder={values.length === 0 ? placeholder : ""}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
              }}
              onFocus={() => setOpen(true)}
              onBlur={() => window.setTimeout(() => setOpen(false), 150)}
              onKeyDown={onKeyDown}
            />
          </li>
        </ul>
        {open && filtered.length > 0 ? (
          <div className="select2-drop select2-drop-active" style={{ display: "block", width: "100%" }}>
            <ul className="select2-results">
              {filtered.filter((c) => !values.includes(c)).map((choice) => (
                <li key={choice} className="select2-results-dept-0 select2-result-selectable">
                  <div className="select2-result-label" onMouseDown={() => addValue(choice)}>
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
