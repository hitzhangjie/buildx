import { useMemo, useState } from "react";
import { BeanEditor } from "../onedev/BeanEditor";
import { Icon } from "../onedev/Icon";
import { InlineDropdown } from "../onedev/DropdownMenu";
import { TypeSelectPanel } from "../onedev/TypeSelectPanel";
import { useSortableList } from "../../hooks/useSortableList";
import { DynamicBeanFields, createDefaultBean } from "./DynamicBeanFields";
import { ModalPanel } from "./ModalPanel";
import {
  STEP_TYPES,
  findTypeDef,
  groupedTypeLabel,
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
  const [insertIndex, setInsertIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<BuildSpecStep | null>(null);

  const [typePickAtIndex, setTypePickAtIndex] = useState<number | null>(null);

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
    setInsertIndex(null);
    setDraft(structuredClone(steps[index]));
  };

  const openAdd = (type: string, atIndex?: number) => {
    const def = findTypeDef(STEP_TYPES, type);
    if (!def) {
      return;
    }
    setEditingIndex(null);
    setInsertIndex(atIndex ?? steps.length);
    setDraft(createDefaultBean(def) as BuildSpecStep);
  };

  const openCopy = (index: number) => {
    setEditingIndex(null);
    setInsertIndex(steps.length);
    setDraft(structuredClone(steps[index]));
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
      const next = [...steps];
      const at = insertIndex ?? next.length;
      next.splice(at, 0, draft);
      onChange(next);
    }
    setDraft(null);
    setEditingIndex(null);
    setInsertIndex(null);
  };

  const changeStepType = (type: string) => {
    const def = findTypeDef(STEP_TYPES, type);
    if (!def) {
      return;
    }
    const next = createDefaultBean(def) as BuildSpecStep;
    if (draft) {
      if (typeof draft.name === "string" && draft.name.trim()) {
        next.name = draft.name;
      }
      if (typeof draft.condition === "string") {
        next.condition = draft.condition;
      }
      if (draft.enabled !== undefined) {
        next.enabled = draft.enabled;
      }
    }
    setDraft(next);
  };

  const addStepButton = <Icon name="plus" className="icon" />;

  return (
    <div className="step-list bean-list">
      <table className="table table-hover">
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
                  className="btn btn-light btn-hover-primary btn-xs btn-icon mr-1"
                  title="Edit"
                  onClick={(e) => {
                    e.preventDefault();
                    openEdit(index);
                  }}
                >
                  <Icon name="edit" className="icon" />
                </a>
                <InlineDropdown
                  className="btn btn-light btn-hover-primary btn-xs btn-icon"
                  align="right"
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
                          setTypePickAtIndex(index);
                        }}
                      >
                        Add before
                      </a>
                      <a
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={(e) => {
                          e.preventDefault();
                          close();
                          setTypePickAtIndex(index + 1);
                        }}
                      >
                        Add after
                      </a>
                      <a
                        href="#"
                        className="list-group-item list-group-item-action"
                        onClick={(e) => {
                          e.preventDefault();
                          close();
                          openCopy(index);
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
        {steps.length === 0 ? (
          <tfoot>
            <tr>
              <td colSpan={4}>
                <em className="text-muted">Unspecified</em>
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
      <div className="foot">
        <InlineDropdown
          className="btn btn-light btn-hover-primary btn-block d-block"
          wrapperClassName="d-block w-100"
          label={addStepButton}
          dropup
        >
          {({ close }) => (
            <TypeSelectPanel
              types={STEP_TYPES}
              onSelect={(type) => {
                close();
                openAdd(type);
              }}
            />
          )}
        </InlineDropdown>
      </div>
      {draft && typeDef ? (
        <ModalPanel
          header={
            <InlineDropdown
              className="text-reset"
              label={
                <>
                  <span>{groupedTypeLabel(typeDef)}</span>
                  <Icon name="arrow" className="icon rotate-90 ml-1" />
                </>
              }
            >
              {({ close }) => (
                <TypeSelectPanel
                  types={STEP_TYPES}
                  onSelect={(type) => {
                    close();
                    changeStepType(type);
                  }}
                />
              )}
            </InlineDropdown>
          }
          description={typeDef.description}
          descriptionClassName="alert alert-light alert-notice mb-3"
          onSave={saveDraft}
          onCancel={() => {
            setDraft(null);
            setEditingIndex(null);
            setInsertIndex(null);
          }}
        >
          <BeanEditor>
            <DynamicBeanFields fields={typeDef.fields} value={draft} onChange={setDraft} />
          </BeanEditor>
        </ModalPanel>
      ) : null}
      {typePickAtIndex != null ? (
        <ModalPanel
          title="Add Step"
          onSave={() => setTypePickAtIndex(null)}
          onCancel={() => setTypePickAtIndex(null)}
          hideFooter
        >
          <TypeSelectPanel
            types={STEP_TYPES}
            onSelect={(type) => {
              openAdd(type, typePickAtIndex);
              setTypePickAtIndex(null);
            }}
          />
        </ModalPanel>
      ) : null}
    </div>
  );
}
