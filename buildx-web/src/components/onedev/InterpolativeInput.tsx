import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./interpolative-input.css";

type AssistMode = "variable" | "literal" | null;

type InterpolativeInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  suggestVariables: (matchWith: string) => string[];
  suggestLiterals: (matchWith: string) => string[];
};

function variablePrefixAtCaret(value: string, caret: number): { start: number; prefix: string } | null {
  let i = caret - 1;
  while (i >= 0 && value[i] !== "@") {
    i--;
  }
  if (i < 0 || value[i] !== "@") {
    return null;
  }
  if (i > 0 && value[i - 1] === "@") {
    return null;
  }
  const prefix = value.slice(i + 1, caret);
  if (prefix.includes("@")) {
    return null;
  }
  return { start: i, prefix };
}

function literalPrefixAtCaret(value: string, caret: number): { start: number; prefix: string } {
  let start = caret;
  while (start > 0 && !/[\s,]/.test(value[start - 1])) {
    start--;
  }
  return { start, prefix: value.slice(start, caret) };
}

/**
 * Text input with @variable and literal autocomplete — mirrors OneDev InterpolativeAssistBehavior.
 */
export function InterpolativeInput({
  value,
  onChange,
  placeholder,
  className,
  suggestVariables,
  suggestLiterals,
}: InterpolativeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [assist, setAssist] = useState<{ mode: AssistMode; start: number; prefix: string } | null>(null);

  const suggestions = useMemo(() => {
    if (!assist?.mode) {
      return [];
    }
    if (assist.mode === "variable") {
      return suggestVariables(assist.prefix);
    }
    return suggestLiterals(assist.prefix);
  }, [assist, suggestLiterals, suggestVariables]);

  const refreshAssist = useCallback(() => {
    const el = inputRef.current;
    if (!el) {
      setAssist(null);
      setOpen(false);
      return;
    }
    const caret = el.selectionStart ?? value.length;
    const variable = variablePrefixAtCaret(value, caret);
    if (variable) {
      setAssist({ mode: "variable", start: variable.start, prefix: variable.prefix });
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    const literal = literalPrefixAtCaret(value, caret);
    if (literal.prefix.length > 0 || caret === value.length) {
      const literals = suggestLiterals(literal.prefix);
      if (literals.length > 0) {
        setAssist({ mode: "literal", start: literal.start, prefix: literal.prefix });
        setOpen(true);
        setActiveIndex(0);
        return;
      }
    }
    setAssist(null);
    setOpen(false);
  }, [suggestLiterals, value]);

  const applySuggestion = useCallback(
    (suggestion: string) => {
      const el = inputRef.current;
      if (!el || !assist) {
        return;
      }
      const caret = el.selectionStart ?? value.length;
      let insert = suggestion;
      let replaceStart = assist.start;
      let replaceEnd = caret;
      if (assist.mode === "variable") {
        insert = `@${suggestion}@`;
        replaceStart = assist.start;
      }
      const next = value.slice(0, replaceStart) + insert + value.slice(replaceEnd);
      onChange(next);
      setOpen(false);
      setAssist(null);
      requestAnimationFrame(() => {
        const pos = replaceStart + insert.length;
        el.focus();
        el.setSelectionRange(pos, pos);
      });
    },
    [assist, onChange, value],
  );

  useEffect(() => {
    if (activeIndex >= suggestions.length) {
      setActiveIndex(0);
    }
  }, [activeIndex, suggestions.length]);

  return (
    <div className="interpolative-input">
      <input
        ref={inputRef}
        type="text"
        className={className ?? "form-control"}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyUp={refreshAssist}
        onClick={refreshAssist}
        onFocus={refreshAssist}
        onBlur={() => {
          window.setTimeout(() => setOpen(false), 150);
        }}
        onKeyDown={(e) => {
          if (!open || suggestions.length === 0) {
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
          } else if (e.key === "Enter" || e.key === "Tab") {
            e.preventDefault();
            applySuggestion(suggestions[activeIndex]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        autoComplete="off"
        spellCheck={false}
      />
      {open && suggestions.length > 0 ? (
        <div className="suggestions" role="listbox">
          {suggestions.map((item, index) => (
            <a
              key={item}
              href="#"
              role="option"
              aria-selected={index === activeIndex}
              className={`suggestion${index === activeIndex ? " active" : ""}`}
              onMouseDown={(e) => {
                e.preventDefault();
                applySuggestion(item);
              }}
            >
              {assist?.mode === "variable" ? `@${item}@` : item}
            </a>
          ))}
        </div>
      ) : null}
    </div>
  );
}
