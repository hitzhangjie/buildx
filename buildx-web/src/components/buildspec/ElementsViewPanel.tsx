import type { ReactNode } from "react";
import { namedElementLabel } from "../../buildspec/types";

type NamedElement = { name?: string };

type ElementsViewPanelProps<T extends NamedElement> = {
  className?: string;
  elements: T[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  renderDetail: (element: T) => ReactNode;
};

export function ElementsViewPanel<T extends NamedElement>({
  className = "",
  elements,
  activeIndex,
  onActiveIndexChange,
  renderDetail,
}: ElementsViewPanelProps<T>) {
  const activeElement = activeIndex >= 0 ? elements[activeIndex] : null;

  return (
    <div className={`content elements d-flex flex-nowrap ${className}`.trim()}>
      <div className="side autofit flex-shrink-0 pr-2">
        <div className="navs">
          {elements.map((element, index) => (
            <div
              key={index}
              className={`nav btn-group btn-block mb-3${index === activeIndex ? " active" : ""}`}
            >
              <a
                href="#"
                className="select btn btn-outline-secondary text-nowrap justify-content-start"
                onClick={(e) => {
                  e.preventDefault();
                  onActiveIndexChange(index);
                }}
              >
                <span className="label">{namedElementLabel(element.name)}</span>
              </a>
            </div>
          ))}
        </div>
      </div>
      <div className="main autofit d-flex flex-column flex-grow-1 ml-4 p-2">
        {activeElement && activeIndex >= 0 ? (
          <div className="body flex-grow-1 autofit p-3">{renderDetail(activeElement)}</div>
        ) : null}
      </div>
    </div>
  );
}
