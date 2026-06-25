import { Icon } from "../onedev/Icon";
import type { JobProperty } from "../../buildspec/types";

type PropertiesEditorPanelProps = {
  properties: JobProperty[];
  onChange: (properties: JobProperty[]) => void;
};

export function PropertiesEditorPanel({ properties, onChange }: PropertiesEditorPanelProps) {
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
              <th>Name</th>
              <th>Value</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {properties.map((prop, index) => (
              <tr key={index}>
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
                <td className="text-nowrap">
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
