import { DynamicBeanFields, createDefaultBean } from "./DynamicBeanFields";
import type { TypeDef } from "./registries";
import { findTypeDef } from "./registries";

type PolymorphicEditorProps = {
  types: readonly TypeDef[];
  value: Record<string, unknown> | null;
  onChange: (value: Record<string, unknown> | null) => void;
  placeholder?: string;
};

/**
 * Polymorphic bean editor with custom-select type picker — mirrors OneDev PolymorphicEditor.html.
 */
export function PolymorphicEditor({
  types,
  value,
  onChange,
  placeholder = "Select type...",
}: PolymorphicEditorProps) {
  const typeKey = typeof value?.type === "string" ? value.type : "";
  const typeDef = typeKey ? findTypeDef(types, typeKey) : undefined;
  const isDefined = Boolean(typeDef && value);

  return (
    <div className={`polymorphic${isDefined ? " property-defined" : ""}`}>
      <div className="type-selector">
        <select
          className="form-control custom-select"
          value={typeKey}
          onChange={(e) => {
            const nextType = e.target.value;
            if (!nextType) {
              onChange(null);
              return;
            }
            const def = findTypeDef(types, nextType);
            if (def) {
              onChange(createDefaultBean(def));
            }
          }}
        >
          <option value="">{placeholder}</option>
          {types.map((t) => (
            <option key={t.type} value={t.type}>
              {t.label}
            </option>
          ))}
        </select>
        {typeDef?.description ? (
          <div className="form-text text-muted">{typeDef.description}</div>
        ) : null}
      </div>
      {isDefined && value && typeDef ? (
        <DynamicBeanFields fields={typeDef.fields} value={value} onChange={onChange} />
      ) : null}
    </div>
  );
}
