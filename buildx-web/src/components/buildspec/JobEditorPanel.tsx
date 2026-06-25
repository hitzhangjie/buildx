import { BeanEditor } from "../onedev/BeanEditor";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { Job } from "../../buildspec/types";

type JobEditorPanelProps = {
  job: Job;
  onChange: (job: Job) => void;
};

export function JobEditorPanel({ job, onChange }: JobEditorPanelProps) {
  const update = (patch: Partial<Job>) => onChange({ ...job, ...patch });

  return (
    <BeanEditor>
      <BeanFormGroup property="name" label="Name" required>
        <input
          type="text"
          className="form-control"
          value={job.name ?? ""}
          onChange={(e) => update({ name: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="jobExecutor" label="Job Executor">
        <input
          type="text"
          className="form-control"
          value={job.jobExecutor ?? ""}
          onChange={(e) => update({ jobExecutor: e.target.value })}
          placeholder="Default"
        />
      </BeanFormGroup>
      <BeanFormGroup property="timeout" label="Timeout (seconds)">
        <input
          type="number"
          className="form-control"
          value={job.timeout ?? ""}
          onChange={(e) => update({ timeout: e.target.value ? Number(e.target.value) : undefined })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="sequentialGroup" label="Sequential Group">
        <input
          type="text"
          className="form-control"
          value={job.sequentialGroup ?? ""}
          onChange={(e) => update({ sequentialGroup: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="retryCondition" label="Retry Condition">
        <input
          type="text"
          className="form-control"
          value={job.retryCondition ?? ""}
          onChange={(e) => update({ retryCondition: e.target.value })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="maxRetries" label="Max Retries">
        <input
          type="number"
          className="form-control"
          value={job.maxRetries ?? ""}
          onChange={(e) => update({ maxRetries: e.target.value ? Number(e.target.value) : undefined })}
        />
      </BeanFormGroup>
      <BeanFormGroup property="retryDelay" label="Retry Delay (seconds)">
        <input
          type="number"
          className="form-control"
          value={job.retryDelay ?? ""}
          onChange={(e) => update({ retryDelay: e.target.value ? Number(e.target.value) : undefined })}
        />
      </BeanFormGroup>
      <BeanFormGroup
        property="requiredServices"
        label="Required Services"
        description="Comma-separated service names"
      >
        <input
          type="text"
          className="form-control"
          value={(job.requiredServices ?? []).join(", ")}
          onChange={(e) =>
            update({
              requiredServices: e.target.value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
        />
      </BeanFormGroup>
      <BeanFormGroup property="steps" label="Steps (YAML)" description="Edit job steps as YAML array">
        <textarea
          className="form-control font-size-sm"
          rows={12}
          value={stepsToYaml(job.steps ?? [])}
          onChange={(e) => update({ steps: parseStepsYaml(e.target.value) })}
        />
      </BeanFormGroup>
    </BeanEditor>
  );
}

function stepsToYaml(steps: Job["steps"]): string {
  if (!steps?.length) {
    return "";
  }
  try {
    return steps.map((s) => JSON.stringify(s, null, 2)).join("\n---\n");
  } catch {
    return "";
  }
}

function parseStepsYaml(text: string): Job["steps"] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }
  const chunks = trimmed.split(/\n---\n/);
  const steps: NonNullable<Job["steps"]> = [];
  for (const chunk of chunks) {
    try {
      steps.push(JSON.parse(chunk) as NonNullable<Job["steps"]>[number]);
    } catch {
      // skip invalid chunk
    }
  }
  return steps;
}
