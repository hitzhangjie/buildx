import type { ReactNode } from "react";
import { ElementNavRow } from "./ElementNavRow";
import { Icon } from "../onedev/Icon";
import { namedElementLabel } from "../../buildspec/types";

type NamedElement = { name?: string };

type ElementsEditorPanelProps<T extends NamedElement> = {
  className?: string;
  elements: T[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onElementsChange: (elements: T[]) => void;
  createElement: () => T;
  renderDetail: (element: T, index: number, update: (next: T) => void) => ReactNode;
};

export function ElementsEditorPanel<T extends NamedElement>({
  className = "",
  elements,
  activeIndex,
  onActiveIndexChange,
  onElementsChange,
  createElement,
  renderDetail,
}: ElementsEditorPanelProps<T>) {
  const updateElement = (index: number, next: T) => {
    const copy = [...elements];
    copy[index] = next;
    onElementsChange(copy);
  };

  const addElement = () => {
    const next = [...elements, createElement()];
    onElementsChange(next);
    onActiveIndexChange(next.length - 1);
  };

  const copyElement = (index: number) => {
    const clone = structuredClone(elements[index]);
    const next = [...elements];
    next.splice(index + 1, 0, clone);
    onElementsChange(next);
    onActiveIndexChange(index + 1);
  };

  const deleteElement = (index: number) => {
    const next = elements.filter((_, i) => i !== index);
    onElementsChange(next);
    if (next.length === 0) {
      onActiveIndexChange(-1);
    } else if (index === activeIndex) {
      onActiveIndexChange(0);
    } else if (index < activeIndex) {
      onActiveIndexChange(activeIndex - 1);
    }
  };

  const activeElement = activeIndex >= 0 ? elements[activeIndex] : null;

  return (
    <div className={`content elements d-flex flex-nowrap ${className}`.trim()}>
      <div className="side autofit flex-shrink-0 pr-2">
        <div className="navs">
          {elements.map((element, index) => (
            <ElementNavRow
              key={index}
              label={namedElementLabel(element.name)}
              active={index === activeIndex}
              onSelect={() => onActiveIndexChange(index)}
              onCopy={() => copyElement(index)}
              onDelete={() => deleteElement(index)}
            />
          ))}
        </div>
        <div className="add btn-group btn-block">
          <a
            href="#"
            className="create btn btn-primary justify-content-start no-suggestions"
            onClick={(e) => {
              e.preventDefault();
              addElement();
            }}
          >
            <Icon name="plus" className="icon flex-shrink-0 mr-1" /> Add New
          </a>
        </div>
      </div>
      <div className="main autofit d-flex flex-column flex-grow-1 ml-4 p-2">
        {activeElement && activeIndex >= 0 ? (
          <div className="body autofit flex-grow-1 p-3">
            {renderDetail(activeElement, activeIndex, (next) => updateElement(activeIndex, next))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
