import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { StepTemplate } from "../../buildspec/types";
import { StepListEditor } from "./StepListEditor";
import { PolymorphicListEditor } from "./PolymorphicListEditor";
import { PARAM_SPEC_TYPES } from "./registries";

type StepTemplateEditorPanelProps = {
  template: StepTemplate;
  onChange: (template: StepTemplate) => void;
};

export function StepTemplateEditorPanel({ template, onChange }: StepTemplateEditorPanelProps) {
  const update = (patch: Partial<StepTemplate>) => onChange({ ...template, ...patch });

  return (
    <BeanEditor>
      <BeanFormGroup property="name" label="Name" required>
        <input
          type="text"
          className="form-control"
          value={template.name ?? ""}
          onChange={(e) => update({ name: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="paramSpecs" label="Parameter Specs">
        <PolymorphicListEditor
          label="Parameter Spec"
          types={PARAM_SPEC_TYPES}
          items={(template.paramSpecs ?? []) as Record<string, unknown>[]}
          onChange={(paramSpecs) => update({ paramSpecs })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="steps" label="Steps">
        <StepListEditor steps={template.steps ?? []} onChange={(steps) => update({ steps })} />
      </BeanFormGroup>
    </BeanEditor>
  );
}
