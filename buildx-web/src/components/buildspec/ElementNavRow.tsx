import { InlineDropdown } from "../onedev/DropdownMenu";
import { Icon } from "../onedev/Icon";
import { namedElementLabel } from "../../buildspec/types";

type ElementNavRowProps = {
  label: string;
  active: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
};

export function ElementNavRow({ label, active, onSelect, onCopy, onDelete }: ElementNavRowProps) {
  return (
    <div className={`nav btn-group btn-block mb-3${active ? " active" : ""}`}>
      <a
        href="#"
        className="select btn btn-outline-secondary text-nowrap justify-content-start"
        onClick={(e) => {
          e.preventDefault();
          onSelect();
        }}
      >
        <Icon name="grip" className="icon drag-indicator flex-shrink-0 mr-1" />
        <span className="label">{label || namedElementLabel(undefined)}</span>
      </a>
      <InlineDropdown
        className="actions btn btn-outline-secondary btn-icon flex-grow-0 flex-shrink-0"
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
                onCopy();
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
                onDelete();
              }}
            >
              Delete
            </a>
          </div>
        )}
      </InlineDropdown>
    </div>
  );
}
