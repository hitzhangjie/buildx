import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import { Icon } from "../onedev/Icon";
import type { BuildSpecImport } from "../../buildspec/types";

type ImportsEditorPanelProps = {
  imports: BuildSpecImport[];
  onChange: (imports: BuildSpecImport[]) => void;
};

export function ImportsEditorPanel({ imports, onChange }: ImportsEditorPanelProps) {
  const updateImport = (index: number, patch: Partial<BuildSpecImport>) => {
    const next = [...imports];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const addImport = () => onChange([...imports, { projectPath: "" }]);

  const deleteImport = (index: number) => onChange(imports.filter((_, i) => i !== index));

  return (
    <div className="content imports imports-editor pr-3 flex-grow-1">
      <div className="alert alert-light-info">
        <Icon name="bulb" className="icon" /> Import build spec elements (jobs, services, step templates and
        properties) from other projects. Imported elements are treated as if they are defined locally. Locally
        defined elements will override imported elements with same name
      </div>
      {imports.map((item, index) => (
        <div key={index} className="import">
          <div className="head import-head d-flex align-items-center">
            <span className="drag-indicator mr-2">
              <Icon name="grip" className="icon" />
            </span>
            <a
              href="#"
              className="btn btn-light btn-xs btn-icon btn-hover-danger text-muted mr-4"
              title="Delete this import"
              onClick={(e) => {
                e.preventDefault();
                deleteImport(index);
              }}
            >
              <Icon name="trash" className="icon" />
            </a>
          </div>
          <div className="body">
            <BeanEditor>
              <BeanFormGroup property="projectPath" label="Project Path" required>
                <input
                  type="text"
                  className="form-control"
                  value={item.projectPath ?? ""}
                  onChange={(e) => updateImport(index, { projectPath: e.target.value })}
                />
              </BeanFormGroup>
              <BeanFormGroup property="revision" label="Revision">
                <input
                  type="text"
                  className="form-control"
                  value={item.revision ?? item.tag ?? ""}
                  onChange={(e) => updateImport(index, { revision: e.target.value, tag: undefined })}
                />
              </BeanFormGroup>
              <BeanFormGroup property="accessTokenSecret" label="Access Token Secret">
                <input
                  type="text"
                  className="form-control"
                  value={item.accessTokenSecret ?? ""}
                  onChange={(e) => updateImport(index, { accessTokenSecret: e.target.value })}
                />
              </BeanFormGroup>
            </BeanEditor>
          </div>
        </div>
      ))}
      <a
        href="#"
        className="add btn btn-light btn-hover-primary btn-block"
        title="Add new import"
        onClick={(e) => {
          e.preventDefault();
          addImport();
        }}
      >
        <Icon name="plus" className="icon align-middle mr-1" />
      </a>
    </div>
  );
}
