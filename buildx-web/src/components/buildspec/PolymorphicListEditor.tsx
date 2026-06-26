import { useMemo, useState, type ReactNode } from "react";
import { Icon } from "../onedev/Icon";
import { InlineDropdown } from "../onedev/DropdownMenu";
import { TypeSelectPanel } from "../onedev/TypeSelectPanel";
import { useSortableList } from "../../hooks/useSortableList";
import { DynamicBeanFields, createDefaultBean } from "./DynamicBeanFields";
import { PolymorphicEditor } from "./PolymorphicEditor";
import { ModalPanel } from "./ModalPanel";
import type { FieldDef, TypeDef } from "./registries";
import { findTypeDef, polymorphicSummary } from "./registries";

type ListColumn = {
  header: string;
  render: (item: Record<string, unknown>) => ReactNode;
};

type PolymorphicListEditorProps = {
  label: string;
  types: TypeDef[];
  items: Record<string, unknown>[];
  onChange: (items: Record<string, unknown>[]) => void;
  /** Optional fixed fields when type is not polymorphic (e.g. job dependencies). */
  fixedFields?: FieldDef[];
  addTooltip?: string;
  modalTitle?: string;
  columns?: ListColumn[];
};

export function PolymorphicListEditor({
  label,
  types,
  items,
  onChange,
  fixedFields,
  addTooltip = "Add new",
  modalTitle,
  columns,
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

  const tableColumns = useMemo(() => {
    if (columns && columns.length > 0) {
      return columns;
    }
    return [{ header: label, render: (item: Record<string, unknown>) => polymorphicSummary(item, types) }];
  }, [columns, label, types]);

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
    if (fixedFields || draft.type) {
      if (editingIndex != null) {
        const next = [...items];
        next[editingIndex] = draft;
        onChange(next);
      } else {
        onChange([...items, draft]);
      }
      setDraft(null);
      setEditingIndex(null);
    }
  };

  const deleteAt = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const addButton = <Icon name="plus" className="icon" />;

  return (
    <div className="draw-card-bean-list bean-list">
      <table className="table table-hover">
        <thead>
          <tr>
            <th className="minimum actions" />
            {tableColumns.map((col) => (
              <th key={col.header}>{col.header}</th>
            ))}
            <th className="minimum actions" />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} {...itemProps(index)}>
              <td className="minimum actions">
                <Icon name="grip" className="icon drag-indicator" />
              </td>
              {tableColumns.map((col) => (
                <td key={col.header}>{col.render(item)}</td>
              ))}
              <td className="minimum actions text-nowrap">
                <a
                  href="#"
                  className="btn btn-light btn-hover-primary btn-xs btn-icon mr-1"
                  title="Edit"
                  onClick={(e) => {
                    e.preventDefault();
                    openEdit(index);
                  }}
                >
                  <Icon name="edit" className="icon" />
                </a>
                <a
                  href="#"
                  className="btn btn-light btn-hover-danger btn-xs btn-icon"
                  title="Delete"
                  onClick={(e) => {
                    e.preventDefault();
                    deleteAt(index);
                  }}
                >
                  <Icon name="trash" className="icon" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
        {items.length === 0 ? (
          <tfoot>
            <tr>
              <td colSpan={tableColumns.length + 2}>
                <em className="text-muted">Unspecified</em>
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
      <div className="foot">
        {fixedFields ? (
          <a
            href="#"
            className="btn btn-light btn-hover-primary btn-block"
            title={addTooltip}
            onClick={(e) => {
              e.preventDefault();
              openAdd("");
            }}
          >
            {addButton}
          </a>
        ) : (
          <InlineDropdown
            className="btn btn-light btn-hover-primary btn-block d-block"
            label={addButton}
          >
            {({ close }) => (
              <TypeSelectPanel
                types={types}
                onSelect={(type) => {
                  close();
                  openAdd(type);
                }}
              />
            )}
          </InlineDropdown>
        )}
      </div>
      {draft && (editingTypeDef || fixedFields) ? (
        <ModalPanel
          title={modalTitle ?? (editingIndex != null ? `Edit ${label}` : `Add ${label}`)}
          onSave={saveDraft}
          onCancel={() => {
            setDraft(null);
            setEditingIndex(null);
          }}
        >
          {fixedFields ? (
            <DynamicBeanFields fields={fixedFields} value={draft} onChange={setDraft} />
          ) : (
            <PolymorphicEditor types={types} value={draft} onChange={setDraft} />
          )}
        </ModalPanel>
      ) : null}
    </div>
  );
}
