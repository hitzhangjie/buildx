import { useSortableList } from "../../hooks/useSortableList";
import { Icon } from "../onedev/Icon";
import type { JobProperty } from "../../buildspec/types";

type PropertiesEditorPanelProps = {
  properties: JobProperty[];
  onChange: (properties: JobProperty[]) => void;
};

export function PropertiesEditorPanel({ properties, onChange }: PropertiesEditorPanelProps) {
  const { itemProps } = useSortableList({
    onReorder: (from, to) => {
      const next = [...properties];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onChange(next);
    },
  });

  const updateRow = (index: number, patch: Partial<JobProperty>) => {
    const next = [...properties];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addRow = () => onChange([...properties, { name: "", value: "" }]);

  const deleteRow = (index: number) => onChange(properties.filter((_, i) => i !== index));

  return (
    <div className="content properties properties-editor pr-3">
      <div className="bean-list">
        <table className="table">
          <thead>
            <tr>
              <th className="minimum actions" />
              <th>Name</th>
              <th>Value</th>
              <th className="minimum actions" />
            </tr>
          </thead>
          <tbody>
            {properties.map((prop, index) => (
              <tr key={index} {...itemProps(index)}>
                <td className="minimum actions">
                  <Icon name="grip" className="icon drag-indicator" />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={prop.name ?? ""}
                    onChange={(e) => updateRow(index, { name: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    className="form-control form-control-sm"
                    value={prop.value ?? ""}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                  />
                </td>
                <td className="text-nowrap minimum actions">
                  <a
                    href="#"
                    className="btn btn-light btn-xs btn-icon btn-hover-danger text-muted"
                    title="Delete"
                    onClick={(e) => {
                      e.preventDefault();
                      deleteRow(index);
                    }}
                  >
                    <Icon name="trash" className="icon" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {properties.length === 0 ? <div className="text-muted font-size-sm mb-2">Unspecified</div> : null}
      <a
        href="#"
        className="add btn btn-light btn-hover-primary btn-block mt-3"
        onClick={(e) => {
          e.preventDefault();
          addRow();
        }}
      >
        <Icon name="plus" className="icon align-middle mr-1" /> Add property
      </a>
    </div>
  );
}
