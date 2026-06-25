import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { StepTemplate } from "../../buildspec/types";

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
      <BeanFormGroup property="steps" label="Steps (YAML)" description="Edit template steps as YAML documents separated by ---">
        <textarea
          className="form-control font-size-sm"
          rows={12}
          value={stepsToText(template.steps ?? [])}
          onChange={(e) => update({ steps: parseStepsText(e.target.value) })}
        />
      </BeanFormGroup>
    </BeanEditor>
  );
}

function stepsToText(steps: StepTemplate["steps"]): string {
  if (!steps?.length) {
    return "";
  }
  return steps.map((s) => JSON.stringify(s, null, 2)).join("\n---\n");
}

function parseStepsText(text: string): StepTemplate["steps"] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const chunks = trimmed.split(/\n---\n/);
  const steps: NonNullable<StepTemplate["steps"]> = [];
  for (const chunk of chunks) {
    try {
      steps.push(JSON.parse(chunk) as NonNullable<StepTemplate["steps"]>[number]);
    } catch {
      // skip invalid chunk
    }
  }
  return steps;
}
