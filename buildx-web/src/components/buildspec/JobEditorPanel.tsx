import { useMemo } from "react";
import { BeanEditor } from "../onedev/BeanEditor";
import { BeanEditorGroup } from "../onedev/BeanEditorGroup";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import { Select2MultiChoice } from "../onedev/Select2MultiChoice";
import type { BuildSpec, Job } from "../../buildspec/types";
import { StepListEditor } from "./StepListEditor";
import { PolymorphicListEditor } from "./PolymorphicListEditor";
import {
  JOB_DEPENDENCY_FIELDS,
  PARAM_SPEC_TYPES,
  POST_BUILD_ACTION_TYPES,
  PROJECT_DEPENDENCY_FIELDS,
  TRIGGER_TYPES,
  findTypeDef,
  triggerDescription,
  triggerParamCount,
} from "./registries";

type JobEditorPanelProps = {
  job: Job;
  buildSpec: BuildSpec;
  onChange: (job: Job) => void;
  fieldErrors?: Record<string, string>;
};

const RETRY_CONDITIONS = ["never", "always", "for-all-errors", "for-temporary-error"];

export function JobEditorPanel({ job, buildSpec, onChange, fieldErrors }: JobEditorPanelProps) {
  const update = (patch: Partial<Job>) => onChange({ ...job, ...patch });

  const serviceChoices = (buildSpec.services ?? [])
    .map((s) => s.name)
    .filter((n): n is string => Boolean(n));

  const showRetryFields = job.retryCondition && job.retryCondition !== "never";

  const paramSpecColumns = useMemo(
    () => [
      {
        header: "Name",
        render: (item: Record<string, unknown>) => String(item.name ?? ""),
      },
      {
        header: "Type",
        render: (item: Record<string, unknown>) => {
          const type = typeof item.type === "string" ? item.type : "";
          return findTypeDef(PARAM_SPEC_TYPES, type)?.label ?? type;
        },
      },
    ],
    [],
  );

  const triggerColumns = useMemo(
    () => [
      {
        header: "Description",
        render: (item: Record<string, unknown>) => triggerDescription(item),
      },
      {
        header: "#Params",
        render: (item: Record<string, unknown>) => String(triggerParamCount(item)),
      },
    ],
    [],
  );

  return (
    <BeanEditor grouped={false}>
      <BeanEditorGroup>
        <BeanFormGroup property="name" label="Name" required fieldError={fieldErrors?.name}>
          <input
            type="text"
            className="form-control"
            value={job.name ?? ""}
            onChange={(e) => update({ name: e.target.value })}
          />
        </BeanFormGroup>
        <BeanFormGroup
          property="jobExecutor"
          label="Job Executor"
          description="Optionally specify executor for this job. Leave empty to use first applicable executor"
          fieldError={fieldErrors?.jobExecutor}
        >
          <input
            type="text"
            className="form-control"
            value={job.jobExecutor ?? ""}
            onChange={(e) => update({ jobExecutor: e.target.value })}
            placeholder="First applicable executor"
          />
        </BeanFormGroup>
        <BeanFormGroup
          property="steps"
          label="Steps"
          description="Steps will be executed serially on same node, sharing the same job working directory"
          fieldError={fieldErrors?.steps}
        >
          <StepListEditor steps={job.steps ?? []} onChange={(steps) => update({ steps })} />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="Params & Triggers" groupClassName="group-params-&-triggers">
        <BeanFormGroup
          property="paramSpecs"
          label="Parameter Specs"
          description="Optionally define parameter specifications of the job"
          fieldError={fieldErrors?.paramSpecs}
        >
          <PolymorphicListEditor
            label="Parameter Spec"
            types={PARAM_SPEC_TYPES}
            modalTitle="Parameter Definition"
            addTooltip="Add new param"
            columns={paramSpecColumns}
            items={(job.paramSpecs ?? []) as Record<string, unknown>[]}
            onChange={(paramSpecs) => update({ paramSpecs })}
          />
        </BeanFormGroup>
        <BeanFormGroup
          property="triggers"
          label="Triggers"
          description="Use triggers to run the job automatically under certain conditions"
          fieldError={fieldErrors?.triggers}
        >
          <PolymorphicListEditor
            label="Trigger"
            types={TRIGGER_TYPES}
            addTooltip="Add new trigger"
            columns={triggerColumns}
            items={(job.triggers ?? []) as Record<string, unknown>[]}
            onChange={(triggers) => update({ triggers })}
          />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="Dependencies & Services" groupClassName="group-dependencies-&-services">
        <BeanFormGroup
          property="jobDependencies"
          label="Job Dependencies"
          description="Job dependencies determines the order and concurrency when run different jobs. You may also specify artifacts to retrieve from upstream jobs"
          fieldError={fieldErrors?.jobDependencies}
        >
          <PolymorphicListEditor
            label="Job Dependency"
            types={[]}
            fixedFields={JOB_DEPENDENCY_FIELDS}
            addTooltip="Add new job dependency"
            columns={[
              {
                header: "Job Dependency",
                render: (item) => String(item.jobName ?? ""),
              },
            ]}
            items={(job.jobDependencies ?? []) as Record<string, unknown>[]}
            onChange={(jobDependencies) =>
              update({ jobDependencies: jobDependencies as Job["jobDependencies"] })
            }
          />
        </BeanFormGroup>
        <BeanFormGroup
          property="projectDependencies"
          label="Project Dependencies"
          description="Use project dependency to retrieve artifacts from other projects"
          fieldError={fieldErrors?.projectDependencies}
        >
          <PolymorphicListEditor
            label="Project Dependency"
            types={[]}
            fixedFields={PROJECT_DEPENDENCY_FIELDS}
            addTooltip="Add new project dependency"
            columns={[
              {
                header: "Project Dependency",
                render: (item) => String(item.projectPath ?? ""),
              },
            ]}
            items={(job.projectDependencies ?? []) as Record<string, unknown>[]}
            onChange={(projectDependencies) =>
              update({ projectDependencies: projectDependencies as Job["projectDependencies"] })
            }
          />
        </BeanFormGroup>
        <BeanFormGroup
          property="requiredServices"
          label="Required Services"
          description="Optionally specify services required by this job"
          fieldError={fieldErrors?.requiredServices}
        >
          <Select2MultiChoice
            choices={serviceChoices}
            values={job.requiredServices ?? []}
            onChange={(requiredServices) => update({ requiredServices })}
            placeholder="No required services"
          />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="More Settings" groupClassName="group-more-settings">
        <BeanFormGroup property="sequentialGroup" label="Sequential Group" fieldError={fieldErrors?.sequentialGroup}>
          <input
            type="text"
            className="form-control"
            value={job.sequentialGroup ?? ""}
            onChange={(e) => update({ sequentialGroup: e.target.value })}
          />
        </BeanFormGroup>
        <BeanFormGroup property="retryCondition" label="Retry Condition" fieldError={fieldErrors?.retryCondition}>
          <select
            className="form-control custom-select"
            value={job.retryCondition ?? "never"}
            onChange={(e) => update({ retryCondition: e.target.value })}
          >
            {RETRY_CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </BeanFormGroup>
        {showRetryFields ? (
          <>
            <BeanFormGroup property="maxRetries" label="Max Retries" fieldError={fieldErrors?.maxRetries}>
              <input
                type="number"
                className="form-control"
                min={1}
                value={job.maxRetries ?? 3}
                onChange={(e) => update({ maxRetries: Number(e.target.value) })}
              />
            </BeanFormGroup>
            <BeanFormGroup property="retryDelay" label="Retry Delay (seconds)" fieldError={fieldErrors?.retryDelay}>
              <input
                type="number"
                className="form-control"
                min={1}
                value={job.retryDelay ?? 30}
                onChange={(e) => update({ retryDelay: Number(e.target.value) })}
              />
            </BeanFormGroup>
          </>
        ) : null}
        <BeanFormGroup property="timeout" label="Timeout (seconds)" fieldError={fieldErrors?.timeout}>
          <input
            type="number"
            className="form-control"
            value={job.timeout ?? 14400}
            onChange={(e) => update({ timeout: e.target.value ? Number(e.target.value) : undefined })}
          />
        </BeanFormGroup>
        <BeanFormGroup property="postBuildActions" label="Post Build Actions" fieldError={fieldErrors?.postBuildActions}>
          <PolymorphicListEditor
            label="Post Build Action"
            types={POST_BUILD_ACTION_TYPES}
            addTooltip="Add new post build action"
            items={(job.postBuildActions ?? []) as Record<string, unknown>[]}
            onChange={(postBuildActions) => update({ postBuildActions })}
          />
        </BeanFormGroup>
      </BeanEditorGroup>
    </BeanEditor>
  );
}
