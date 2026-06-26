import { useMemo, useState } from "react";
import { BeanEditor } from "../onedev/BeanEditor";
import { Icon } from "../onedev/Icon";
import { InlineDropdown } from "../onedev/DropdownMenu";
import { useSortableList } from "../../hooks/useSortableList";
import { DynamicBeanFields, createDefaultBean } from "./DynamicBeanFields";
import { ModalPanel } from "./ModalPanel";
import type { FieldDef, TypeDef } from "./registries";
import { findTypeDef, polymorphicSummary } from "./registries";

type PolymorphicListEditorProps = {
  label: string;
  types: TypeDef[];
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  /** Optional fixed fields when type is not polymorphic (e.g. job dependencies). */
  fixedFields?: FieldDef[];
  addTooltip?: string;
};

export function PolymorphicListEditor({
  label,
  types,
  items,
  onChange,
  fixedFields,
  addTooltip = "Add new",
}: PolymorphicListEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown> | null>(null);

  const { itemProps } = useSortableList({
    onReorder: (from, to) => {
      const next = [...items];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
  });

  const editingTypeDef = useMemo(() => {
    if (!draft) {
      return undefined;
    }
    if (fixedFields) {
      return { type: label, label, fields: fixedFields };
    }
    const type = typeof draft.type === "string" ? draft.type : "";
    return findTypeDef(types, type);
  }, [draft, fixedFields, label, types]);

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDraft(structuredClone(items[index]));
  };

  const openAdd = (type: string) => {
    const def = findTypeDef(types, type);
    if (!def && !fixedFields) {
      return;
    }
    setEditingIndex(null);
    setDraft(
      fixedFields
        ? {}
        : createDefaultBean(def ?? { type, defaults: { type } }),
    );
  };

  const saveDraft = () => {
    if (!draft) {
      return;
    }
    if (editingIndex != null) {
      const next = [...items];
      next[editingIndex] = draft;
      onChange(next);
    } else {
      onChange([...items, draft]);
    }
    setDraft(null);
    setEditingIndex(null);
  };

  const deleteAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const copyAt = (index: number) => {
    setEditingIndex(null);
    setDraft(structuredClone(items[index]));
  };

  return (
    <div className="polymorphic-list-editor bean-list">
      <table className="table">
        <thead>
          <tr>
            <th className="minimum actions" />
            <th>{label}</th>
            <th className="minimum actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} {...itemProps(index)}>
              <td className="minimum actions">
                <Icon name="grip" className="icon drag-indicator" />
              </td>
              <td>{polymorphicSummary(item, types)}</td>
              <td className="minimum actions text-nowrap">
                <a
                  href="#"
                  className="btn btn-light btn-xs btn-icon mr-1"
                  title="Edit"
                  onClick={(e) => {
                    e.preventDefault();
                    openEdit(index);
                  }}
                >
                  <Icon name="edit" className="icon" />
                </a>
                <InlineDropdown
                  className="btn btn-light btn-xs btn-icon"
                  label={<Icon name="arrow" className="icon rotate-90" />}
                >
                  {({ close }) => (
                    <div className="list-group list-group-flush">
                      <a
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={(e) => {
                          e.preventDefault();
                          close();
                          copyAt(index);
                        }}
                      >
                        Copy
                      </a>
                      <a
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={(e) => {
                          e.preventDefault();
                          close();
                          deleteAt(index);
                        }}
                      >
                        Delete
                      </a>
                    </div>
                  )}
                </InlineDropdown>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {items.length === 0 ? <div className="text-muted font-size-sm mb-2">Unspecified</div> : null}
      {fixedFields ? (
        <a
          href="#"
          className="add btn btn-light btn-hover-primary btn-block"
          title={addTooltip}
          onClick={(e) => {
            e.preventDefault();
            openAdd("");
          }}
        >
          <Icon name="plus" className="icon align-middle mr-1" /> Add new
        </a>
      ) : (
        <InlineDropdown
          className="add btn btn-light btn-hover-primary btn-block text-left"
          label={
            <>
              <Icon name="plus" className="icon align-middle mr-1" /> Add new
            </>
          }
        >
          {({ close }) => (
            <div className="list-group list-group-flush type-select">
              {types.map((typeDef) => (
                <a
                  key={typeDef.type}
                  href="#"
                  className="list-group-item list-group-item-action"
                  onClick={(e) => {
                    e.preventDefault();
                    close();
                    openAdd(typeDef.type);
                  }}
                >
                  {typeDef.group ? (
                    <span className="text-muted font-size-sm d-block">{typeDef.group}</span>
                  ) : null}
                  {typeDef.label}
                </a>
              ))}
            </div>
          )}
        </InlineDropdown>
      )}
      {draft && editingTypeDef ? (
        <ModalPanel
          title={editingIndex != null ? `Edit ${label}` : `Add ${label}`}
          description={editingTypeDef.description}
          onSave={saveDraft}
          onCancel={() => {
            setDraft(null);
            setEditingIndex(null);
          }}
        >
          <BeanEditor>
            {!fixedFields && editingIndex != null ? (
              <InlineDropdown
                className="btn btn-light mb-3"
                label={
                  <>
                    Type: {findTypeDef(types, String(draft.type))?.label ?? draft.type}{" "}
                    <Icon name="arrow" className="icon rotate-90 ml-1" />
                  </>
                }
              >
                {({ close }) => (
                  <div className="list-group list-group-flush">
                    {types.map((typeDef) => (
                      <a
                        key={typeDef.type}
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={(e) => {
                          e.preventDefault();
                          close();
                          setDraft(createDefaultBean(typeDef));
                        }}
                      >
                        {typeDef.label}
                      </a>
                    ))}
                  </div>
                )}
              </InlineDropdown>
            ) : null}
            <DynamicBeanFields
              fields={editingTypeDef.fields}
              value={draft}
              onChange={setDraft}
            />
          </BeanEditor>
        </ModalPanel>
      ) : null}
    </div>
  );
}
