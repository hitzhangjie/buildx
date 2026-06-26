import { InlineDropdown } from "../onedev/DropdownMenu";
import { Icon } from "../onedev/Icon";
import { namedElementLabel } from "../../buildspec/types";

type ElementNavRowProps = {
  label: string;
  active: boolean;
  onSelect: () => void;
  onCopy: () => void;
  onDelete: () => void;
  /** Pipeline job rows use flex-nowrap; list rows (services, etc.) use btn-block. */
  layout?: "list" | "pipeline";
};

export function ElementNavRow({
  label,
  active,
  onSelect,
  onCopy,
  onDelete,
  layout = "list",
}: ElementNavRowProps) {
  const groupClass =
    layout === "pipeline"
      ? `nav btn-group flex-nowrap${active ? " active" : ""}`
      : `nav btn-group btn-block mb-3${active ? " active" : ""}`;

  return (
    <div className={groupClass}>
      <a
        href="#"
        className={`select btn btn-outline-secondary text-nowrap justify-content-start d-flex align-items-center${layout === "pipeline" ? " flex-grow-1" : ""}`}
        onClick={(e) => {
          e.preventDefault();
          onSelect();
        }}
      >
        <Icon name="grip" className="icon drag-indicator flex-shrink-0 mr-1" />
        <span className="label">{label || namedElementLabel(undefined)}</span>
      </a>
      <InlineDropdown
        variant="btn-group"
        className="actions btn btn-outline-secondary btn-icon flex-grow-0 flex-shrink-0"
        align="right"
        title="Operations"
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
