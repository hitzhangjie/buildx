import type { ReactNode } from "react";
import { BeanEditor } from "../onedev/BeanEditor";
import { BeanEditorGroup } from "../onedev/BeanEditorGroup";
import { BeanFormGroup } from "../onedev/BeanFormGroup";
import type { BuildSpecStep, Job, JobProperty, Service, StepTemplate } from "../../buildspec/types";
import { findTypeDef, STEP_TYPES, stepConditionLabel, stepDisplayName } from "./registries";

/** Read-only bean panel — mirrors OneDev BeanViewer (bean-viewer editable). */
function BeanViewerPanel({ children, grouped = true }: { children: ReactNode; grouped?: boolean }) {
  return (
    <div className="bean-viewer editable">
      {grouped ? <BeanEditorGroup>{children}</BeanEditorGroup> : children}
    </div>
  );
}

function ReadOnlyValue({ value }: { value: unknown }) {
  if (value == null || value === "") {
    return <span className="text-muted font-italic">Not specified</span>;
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return <span className="text-muted font-italic">Not specified</span>;
    }
    return <span>{value.map(String).join(", ")}</span>;
  }
  if (typeof value === "object") {
    return <pre className="mb-0 font-size-sm">{JSON.stringify(value, null, 2)}</pre>;
  }
  return <span>{String(value)}</span>;
}

function StepsViewer({ steps }: { steps: BuildSpecStep[] }) {
  return (
    <div className="step-list bean-list">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>Name</th>
            <th>Condition</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step, i) => (
            <tr key={i}>
              <td>{stepDisplayName(step)}</td>
              <td>
                {stepConditionLabel(step) === "Unspecified" ? (
                  <em className="text-muted">Unspecified</em>
                ) : (
                  stepConditionLabel(step)
                )}
              </td>
            </tr>
          ))}
        </tbody>
        {steps.length === 0 ? (
          <tfoot>
            <tr>
              <td colSpan={2}>
                <em className="text-muted">Unspecified</em>
              </td>
            </tr>
          </tfoot>
        ) : null}
      </table>
    </div>
  );
}

function ListViewer({ items, labelKey = "name" }: { items: Record<string, unknown>[]; labelKey?: string }) {
  if (!items.length) {
    return <div className="text-muted font-italic">Not specified</div>;
  }
  return (
    <ul className="mb-0 pl-3">
      {items.map((item, i) => (
        <li key={i}>{String(item[labelKey] ?? item.type ?? JSON.stringify(item))}</li>
      ))}
    </ul>
  );
}

export function JobViewer({ job }: { job: Job }) {
  const showRetryFields = job.retryCondition && job.retryCondition !== "never";

  return (
    <BeanViewerPanel grouped={false}>
      <BeanEditorGroup>
        <BeanFormGroup property="name" label="Name">
          <ReadOnlyValue value={job.name} />
        </BeanFormGroup>
        <BeanFormGroup property="jobExecutor" label="Job Executor">
          <ReadOnlyValue value={job.jobExecutor} />
        </BeanFormGroup>
        <BeanFormGroup property="steps" label="Steps">
          <StepsViewer steps={job.steps ?? []} />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="Params & Triggers" groupClassName="group-params-&-triggers">
        <BeanFormGroup property="paramSpecs" label="Parameter Specs">
          <ListViewer items={(job.paramSpecs ?? []) as Record<string, unknown>[]} />
        </BeanFormGroup>
        <BeanFormGroup property="triggers" label="Triggers">
          <ListViewer items={(job.triggers ?? []) as Record<string, unknown>[]} labelKey="type" />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="Dependencies & Services" groupClassName="group-dependencies-&-services">
        <BeanFormGroup property="jobDependencies" label="Job Dependencies">
          <ListViewer items={(job.jobDependencies ?? []) as Record<string, unknown>[]} labelKey="jobName" />
        </BeanFormGroup>
        <BeanFormGroup property="projectDependencies" label="Project Dependencies">
          <ListViewer items={(job.projectDependencies ?? []) as Record<string, unknown>[]} labelKey="projectPath" />
        </BeanFormGroup>
        <BeanFormGroup property="requiredServices" label="Required Services">
          <ReadOnlyValue value={job.requiredServices} />
        </BeanFormGroup>
      </BeanEditorGroup>

      <BeanEditorGroup title="More Settings" groupClassName="group-more-settings">
        <BeanFormGroup property="sequentialGroup" label="Sequential Group">
          <ReadOnlyValue value={job.sequentialGroup} />
        </BeanFormGroup>
        <BeanFormGroup property="retryCondition" label="Retry Condition">
          <ReadOnlyValue value={job.retryCondition} />
        </BeanFormGroup>
        {showRetryFields ? (
          <>
            <BeanFormGroup property="maxRetries" label="Max Retries">
              <ReadOnlyValue value={job.maxRetries} />
            </BeanFormGroup>
            <BeanFormGroup property="retryDelay" label="Retry Delay (seconds)">
              <ReadOnlyValue value={job.retryDelay} />
            </BeanFormGroup>
          </>
        ) : null}
        <BeanFormGroup property="timeout" label="Timeout (seconds)">
          <ReadOnlyValue value={job.timeout} />
        </BeanFormGroup>
        <BeanFormGroup property="postBuildActions" label="Post Build Actions">
          <ListViewer items={(job.postBuildActions ?? []) as Record<string, unknown>[]} labelKey="type" />
        </BeanFormGroup>
      </BeanEditorGroup>
    </BeanViewerPanel>
  );
}

export function ServiceViewer({ service }: { service: Service }) {
  return (
    <BeanEditor>
      <BeanFormGroup property="name" label="Name">
        <ReadOnlyValue value={service.name} />
      </BeanFormGroup>
      <BeanFormGroup property="image" label="Image">
        <ReadOnlyValue value={service.image} />
      </BeanFormGroup>
      <BeanFormGroup property="command" label="Command">
        <ReadOnlyValue value={service.command} />
      </BeanFormGroup>
      <BeanFormGroup property="readyCommand" label="Ready Command">
        <ReadOnlyValue value={service.readyCommand} />
      </BeanFormGroup>
      <BeanFormGroup property="ports" label="Ports">
        <ReadOnlyValue value={service.ports} />
      </BeanFormGroup>
    </BeanEditor>
  );
}

export function StepTemplateViewer({ template }: { template: StepTemplate }) {
  return (
    <BeanEditor>
      <BeanFormGroup property="name" label="Name">
        <ReadOnlyValue value={template.name} />
      </BeanFormGroup>
      <BeanFormGroup property="paramSpecs" label="Parameter Specs">
        <ListViewer items={(template.paramSpecs ?? []) as Record<string, unknown>[]} />
      </BeanFormGroup>
      <BeanFormGroup property="steps" label="Steps">
        <StepsViewer steps={template.steps ?? []} />
      </BeanFormGroup>
    </BeanEditor>
  );
}

export function PropertiesViewer({ properties }: { properties: JobProperty[] }) {
  if (!properties.length) {
    return <div className="alert alert-notice alert-light-warning d-flex">No properties defined</div>;
  }
  return (
    <div className="properties autofit pr-3">
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {properties.map((prop, i) => (
            <tr key={i}>
              <td>{prop.name}</td>
              <td>{prop.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function stepTypeLabel(type: string | undefined): string {
  return findTypeDef(STEP_TYPES, type)?.label ?? type ?? "";
}
