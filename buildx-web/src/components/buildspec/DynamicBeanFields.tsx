import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { FieldDef } from "./registries";

function getNestedValue(obj: Record<string, unknown>, key: string): unknown {
  if (!key.includes(".")) {
    return obj[key];
  }
  const parts = key.split(".");
  let cur: unknown = obj;
  for (const part of parts) {
    if (!cur || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function setNestedValue(obj: Record<string, unknown>, key: string, value: unknown): Record<string, unknown> {
  if (!key.includes(".")) {
    return { ...obj, [key]: value };
  }
  const parts = key.split(".");
  const root = { ...obj };
  let cur: Record<string, unknown> = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const next = { ...(cur[parts[i]] as Record<string, unknown> | undefined) };
    cur[parts[i]] = next;
    cur = next;
  }
  cur[parts[parts.length - 1]] = value;
  return root;
}

function isFieldVisible(field: FieldDef, value: Record<string, unknown>): boolean {
  if (!field.hideWhen) {
    return true;
  }
  const current = getNestedValue(value, field.hideWhen.field);
  if (field.hideWhen.equals === "never") {
    return current !== "never";
  }
  return current !== field.hideWhen.equals;
}

type DynamicBeanFieldsProps = {
  fields: FieldDef[];
  value: Record<string, unknown>;
  onChange: (value: Record<string, unknown>) => void;
};

export function DynamicBeanFields({ fields, value, onChange }: DynamicBeanFieldsProps) {
  const updateField = (key: string, fieldValue: unknown) => {
    onChange(setNestedValue(value, key, fieldValue));
  };

  return (
    <>
      {fields.map((field) => {
        if (!isFieldVisible(field, value)) {
          return null;
        }
        const raw = getNestedValue(value, field.key);
        return (
          <BeanFormGroup
            key={field.key}
            property={field.key.replace(/\./g, "-")}
            label={field.label}
            required={field.required}
            description={field.description}
          >
            {field.kind === "boolean" ? (
              <div className="custom-control custom-switch">
                <input
                  type="checkbox"
                  className="custom-control-input"
                  id={`field-${field.key}`}
                  checked={Boolean(raw)}
                  onChange={(e) => updateField(field.key, e.target.checked)}
                />
                <label className="custom-control-label" htmlFor={`field-${field.key}`} />
              </div>
            ) : field.kind === "textarea" ? (
              <textarea
                className="form-control"
                rows={6}
                value={typeof raw === "string" ? raw : ""}
                placeholder={field.placeholder}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            ) : field.kind === "enum" ? (
              <select
                className="form-control custom-select"
                value={typeof raw === "string" || typeof raw === "number" ? String(raw) : ""}
                onChange={(e) => updateField(field.key, e.target.value)}
              >
                {(field.enumValues ?? []).map((opt) => (
                  <option key={opt || "__empty"} value={opt}>
                    {opt || "(default)"}
                  </option>
                ))}
              </select>
            ) : field.kind === "stringList" ? (
              <input
                type="text"
                className="form-control"
                value={Array.isArray(raw) ? raw.join(", ") : ""}
                placeholder={field.placeholder ?? "Comma-separated values"}
                onChange={(e) =>
                  updateField(
                    field.key,
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
              />
            ) : field.kind === "number" ? (
              <input
                type="number"
                className="form-control"
                value={typeof raw === "number" ? raw : raw === undefined ? "" : Number(raw)}
                onChange={(e) =>
                  updateField(field.key, e.target.value === "" ? undefined : Number(e.target.value))
                }
              />
            ) : (
              <input
                type="text"
                className="form-control"
                value={typeof raw === "string" ? raw : raw == null ? "" : String(raw)}
                placeholder={field.placeholder}
                onChange={(e) => updateField(field.key, e.target.value)}
              />
            )}
          </BeanFormGroup>
        );
      })}
    </>
  );
}

export function createDefaultBean(typeDef: { type: string; defaults?: Record<string, unknown> }): Record<string, unknown> {
  return { type: typeDef.type, ...(typeDef.defaults ?? {}) };
}
