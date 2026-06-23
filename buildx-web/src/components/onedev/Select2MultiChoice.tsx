import { type KeyboardEvent, useState } from "react";

type Select2MultiChoiceProps = {
  values: string[];
  onChange: (values: string[]) => void;
  choices: string[];
  placeholder?: string;
};

/**
 * Select2 v3 multi-choice shell (RoleMultiChoice / MultiChoiceEditor).
 */
export function Select2MultiChoice({
  values,
  onChange,
  choices,
  placeholder = "",
}: Select2MultiChoiceProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = choices.filter(
    (c) => !values.includes(c) && c.toLowerCase().includes(query.toLowerCase()),
  );

  function addValue(value: string) {
    if (!values.includes(value)) {
      onChange([...values, value]);
    }
    setQuery("");
    setOpen(false);
  }

  function removeValue(value: string) {
    onChange(values.filter((v) => v !== value));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !query && values.length > 0) {
      onChange(values.slice(0, -1));
    }
    if (e.key === "Enter" && filtered.length === 1) {
      e.preventDefault();
      addValue(filtered[0]);
    }
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
              {filtered.map((choice) => (
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
