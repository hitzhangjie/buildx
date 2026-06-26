import { useMemo, useState } from "react";
import { BeanEditor } from "../onedev/BeanEditor";
import { Icon } from "../onedev/Icon";
import { InlineDropdown } from "../onedev/DropdownMenu";
import { useSortableList } from "../../hooks/useSortableList";
import { DynamicBeanFields, createDefaultBean } from "./DynamicBeanFields";
import { ModalPanel } from "./ModalPanel";
import {
  STEP_TYPES,
  findTypeDef,
  stepConditionLabel,
  stepDisplayName,
} from "./registries";
import type { BuildSpecStep } from "../../buildspec/types";

type StepListEditorProps = {
  steps: BuildSpecStep[];
  onChange: (steps: BuildSpecStep[]) => void;
};

export function StepListEditor({ steps, onChange }: StepListEditorProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BuildSpecStep | null>(null);

  const { itemProps } = useSortableList({
    onReorder: (from, to) => {
      const next = [...steps];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
  });

  const typeDef = useMemo(() => {
    if (!draft) {
      return undefined;
    }
    return findTypeDef(STEP_TYPES, typeof draft.type === "string" ? draft.type : undefined);
  }, [draft]);

  const openEdit = (index: number) => {
    setEditingIndex(index);
    setDraft(structuredClone(steps[index]));
  };

  const openAdd = (type: string) => {
    const def = findTypeDef(STEP_TYPES, type);
    if (!def) {
      return;
    }
    setEditingIndex(null);
    setDraft(createDefaultBean(def) as BuildSpecStep);
  };

  const saveDraft = () => {
    if (!draft) {
      return;
    }
    if (editingIndex != null) {
      const next = [...steps];
      next[editingIndex] = draft;
      onChange(next);
    } else {
      onChange([...steps, draft]);
    }
    setDraft(null);
    setEditingIndex(null);
  };

  return (
    <div className="step-list-editor bean-list">
      <table className="table">
        <thead>
          <tr>
            <th className="minimum actions" />
            <th>Name</th>
            <th>Condition</th>
            <th className="minimum actions" />
          </tr>
        </thead>
        <tbody>
          {steps.map((step, index) => (
            <tr key={index} {...itemProps(index)}>
              <td className="minimum actions">
                <Icon name="grip" className="icon drag-indicator" />
              </td>
              <td>{stepDisplayName(step)}</td>
              <td>
                {stepConditionLabel(step) === "Unspecified" ? (
                  <em className="text-muted">Unspecified</em>
                ) : (
                  stepConditionLabel(step)
                )}
              </td>
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
                          setEditingIndex(null);
                          setDraft(structuredClone(steps[index]));
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
                          onChange(steps.filter((_, i) => i !== index));
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
      {steps.length === 0 ? <div className="text-muted font-size-sm mb-2">Unspecified</div> : null}
      <InlineDropdown
        className="add-new btn btn-light btn-hover-primary"
        label={
          <>
            <Icon name="plus" className="icon align-middle mr-1" /> Add New
          </>
        }
      >
        {({ close }) => (
          <div className="list-group list-group-flush type-select">
            {STEP_TYPES.map((typeDef) => (
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
      {draft && typeDef ? (
        <ModalPanel
          title={editingIndex != null ? "Edit Step" : "Add Step"}
          description={typeDef.description}
          onSave={saveDraft}
          onCancel={() => {
            setDraft(null);
            setEditingIndex(null);
          }}
        >
          <BeanEditor>
            <InlineDropdown
              className="btn btn-light mb-3"
              label={
                <>
                  {typeDef.group ? `${typeDef.group} / ` : ""}
                  {typeDef.label} <Icon name="arrow" className="icon rotate-90 ml-1" />
                </>
              }
            >
              {({ close }) => (
                <div className="list-group list-group-flush">
                  {STEP_TYPES.map((def) => (
                    <a
                      key={def.type}
                      href="#"
                      className="list-group-item list-group-item-action"
                      onClick={(e) => {
                        e.preventDefault();
                        close();
                        setDraft(createDefaultBean(def) as BuildSpecStep);
                      }}
                    >
                      {def.label}
                    </a>
                  ))}
                </div>
              )}
            </InlineDropdown>
            <DynamicBeanFields fields={typeDef.fields} value={draft} onChange={setDraft} />
          </BeanEditor>
        </ModalPanel>
      ) : null}
    </div>
  );
}
