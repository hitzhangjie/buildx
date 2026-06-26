/** Polymorphic type metadata for buildspec BeanEditors (mirrors OneDev @Editable types). */

export type FieldKind =
  | "string"
  | "number"
  | "boolean"
  | "textarea"
  | "enum"
  | "stringList";

export type FieldDef = {
  key: string;
  label: string;
  kind: FieldKind;
  required?: boolean;
  description?: string;
  placeholder?: string;
  enumValues?: string[];
  /** Hide when another field equals value (OneDev @DependsOn). */
  hideWhen?: { field: string; equals: string | boolean };
};

export type TypeDef = {
  type: string;
  label: string;
  group?: string;
  description?: string;
  fields: FieldDef[];
  defaults?: Record<string, unknown>;
};

const stepBaseFields: FieldDef[] = [
  { key: "name", label: "Name", kind: "string" },
  { key: "condition", label: "Condition", kind: "string", placeholder: "always" },
  { key: "enabled", label: "Enabled", kind: "boolean" },
];

export const STEP_TYPES: TypeDef[] = [
  {
    type: "command",
    label: "Run Container",
    group: "General",
    description: "Run commands in a container",
    fields: [
      ...stepBaseFields,
      { key: "image", label: "Image", kind: "string", required: true },
      { key: "interpreter", label: "Interpreter", kind: "string" },
      { key: "commands", label: "Commands", kind: "textarea", required: true },
      { key: "useTTY", label: "Use TTY", kind: "boolean" },
    ],
    defaults: { type: "command", enabled: true },
  },
  {
    type: "checkout",
    label: "Checkout Code",
    group: "General",
    fields: [
      ...stepBaseFields,
      { key: "withLfs", label: "With LFS", kind: "boolean" },
      { key: "withSubmodules", label: "With Submodules", kind: "boolean" },
      { key: "cloneDepth", label: "Clone Depth", kind: "number" },
    ],
    defaults: { type: "checkout", enabled: true },
  },
  {
    type: "setup-cache",
    label: "Setup Cache",
    group: "General",
    fields: [
      ...stepBaseFields,
      { key: "key", label: "Key", kind: "string", required: true },
      { key: "paths", label: "Paths", kind: "stringList", required: true },
      { key: "checksumFiles", label: "Checksum Files", kind: "string" },
      {
        key: "uploadStrategy",
        label: "Upload Strategy",
        kind: "enum",
        enumValues: ["", "always", "on-success"],
      },
    ],
    defaults: { type: "setup-cache", enabled: true },
  },
  {
    type: "publish-artifact",
    label: "Publish Artifact",
    group: "General",
    fields: [
      ...stepBaseFields,
      { key: "artifacts", label: "Artifacts", kind: "string", required: true },
      { key: "sourcePath", label: "Source Path", kind: "string" },
      { key: "targetPath", label: "Target Path", kind: "string" },
    ],
    defaults: { type: "publish-artifact", enabled: true },
  },
  {
    type: "publish-report",
    label: "Publish Report",
    group: "General",
    fields: [
      ...stepBaseFields,
      { key: "reportName", label: "Report Name", kind: "string", required: true },
      {
        key: "reportType",
        label: "Report Type",
        kind: "enum",
        enumValues: ["junit", "clover", "generic"],
        required: true,
      },
      { key: "path", label: "Path", kind: "string", required: true },
    ],
    defaults: { type: "publish-report", enabled: true },
  },
  {
    type: "use-template",
    label: "Use Step Template",
    group: "General",
    fields: [
      ...stepBaseFields,
      { key: "templateName", label: "Template Name", kind: "string", required: true },
    ],
    defaults: { type: "use-template", enabled: true },
  },
  {
    type: "build-image",
    label: "Build Image",
    group: "Container",
    fields: [
      ...stepBaseFields,
      { key: "dockerfile", label: "Dockerfile", kind: "string" },
      { key: "contextPath", label: "Context Path", kind: "string" },
      { key: "tags", label: "Tags", kind: "stringList" },
    ],
    defaults: { type: "build-image", enabled: true },
  },
  {
    type: "push-image",
    label: "Push Image",
    group: "Container",
    fields: [
      ...stepBaseFields,
      { key: "imageTags", label: "Image Tags", kind: "stringList" },
    ],
    defaults: { type: "push-image", enabled: true },
  },
  {
    type: "pull-image",
    label: "Pull Image",
    group: "Container",
    fields: [
      ...stepBaseFields,
      { key: "imageTags", label: "Image Tags", kind: "stringList" },
    ],
    defaults: { type: "pull-image", enabled: true },
  },
  {
    type: "run-container",
    label: "Run Image",
    group: "Container",
    fields: [
      ...stepBaseFields,
      { key: "image", label: "Image", kind: "string", required: true },
      { key: "commands", label: "Commands", kind: "textarea" },
    ],
    defaults: { type: "run-container", enabled: true },
  },
  {
    type: "create-branch",
    label: "Create Branch",
    group: "SCM",
    fields: [
      ...stepBaseFields,
      { key: "branchName", label: "Branch Name", kind: "string", required: true },
      { key: "commitMessage", label: "Commit Message", kind: "string" },
    ],
    defaults: { type: "create-branch", enabled: true },
  },
  {
    type: "create-tag",
    label: "Create Tag",
    group: "SCM",
    fields: [
      ...stepBaseFields,
      { key: "tagName", label: "Tag Name", kind: "string", required: true },
      { key: "message", label: "Message", kind: "string" },
    ],
    defaults: { type: "create-tag", enabled: true },
  },
  {
    type: "set-build-version",
    label: "Set Build Version",
    group: "SCM",
    fields: [
      ...stepBaseFields,
      { key: "version", label: "Version", kind: "string", required: true },
    ],
    defaults: { type: "set-build-version", enabled: true },
  },
  {
    type: "create-pull-request",
    label: "Create Pull Request",
    group: "SCM",
    fields: [
      ...stepBaseFields,
      { key: "targetBranch", label: "Target Branch", kind: "string", required: true },
      { key: "prTitle", label: "PR Title", kind: "string", required: true },
      { key: "prBody", label: "PR Body", kind: "textarea" },
    ],
    defaults: { type: "create-pull-request", enabled: true },
  },
];

export const TRIGGER_TYPES: TypeDef[] = [
  {
    type: "branch-update",
    label: "Branch Update",
    fields: [
      { key: "branches", label: "Branches", kind: "string", required: true },
      { key: "paths", label: "Paths", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "branch-update" },
  },
  {
    type: "tag-create",
    label: "Tag Create",
    fields: [
      { key: "tags", label: "Tags", kind: "string", required: true },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "tag-create" },
  },
  {
    type: "pull-request",
    label: "Pull Request Open",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request" },
  },
  {
    type: "pull-request-update",
    label: "Pull Request Update",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request-update" },
  },
  {
    type: "pull-request-merge",
    label: "Pull Request Merge",
    fields: [
      { key: "branches", label: "Target Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "pull-request-merge" },
  },
  {
    type: "pull-request-discard",
    label: "Pull Request Discard",
    fields: [{ key: "projects", label: "Projects", kind: "string" }],
    defaults: { type: "pull-request-discard" },
  },
  {
    type: "schedule",
    label: "Schedule",
    fields: [
      { key: "cronExpression", label: "Cron Expression", kind: "string", required: true },
      { key: "branches", label: "Branches", kind: "string" },
      { key: "projects", label: "Projects", kind: "string" },
    ],
    defaults: { type: "schedule" },
  },
  {
    type: "dependency-finished",
    label: "Dependency Finished",
    fields: [{ key: "projects", label: "Projects", kind: "string" }],
    defaults: { type: "dependency-finished" },
  },
];

export const PARAM_SPEC_TYPES: TypeDef[] = [
  {
    type: "text",
    label: "Text",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "allowEmpty", label: "Allow Empty", kind: "boolean" },
      { key: "allowMultiple", label: "Allow Multiple", kind: "boolean" },
      { key: "defaultValueProvider", label: "Default Value", kind: "string" },
    ],
    defaults: { type: "text" },
  },
  {
    type: "boolean",
    label: "Boolean",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "enum", enumValues: ["true", "false"] },
    ],
    defaults: { type: "boolean" },
  },
  {
    type: "secret",
    label: "Secret",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "secret" },
  },
  {
    type: "integer",
    label: "Integer",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "number" },
    ],
    defaults: { type: "integer" },
  },
  {
    type: "float",
    label: "Float",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "defaultValueProvider", label: "Default Value", kind: "number" },
    ],
    defaults: { type: "float" },
  },
  {
    type: "choice",
    label: "Choice",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
      { key: "choices", label: "Choices", kind: "stringList", required: true },
      { key: "defaultValueProvider", label: "Default Value", kind: "string" },
    ],
    defaults: { type: "choice" },
  },
  {
    type: "date",
    label: "Date",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "date" },
  },
  {
    type: "commit",
    label: "Commit",
    fields: [
      { key: "name", label: "Name", kind: "string", required: true },
      { key: "description", label: "Description", kind: "string" },
    ],
    defaults: { type: "commit" },
  },
];

export const POST_BUILD_ACTION_TYPES: TypeDef[] = [
  {
    type: "create-issue",
    label: "Create Issue",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "issueFields", label: "Issue Fields", kind: "textarea" },
    ],
    defaults: { type: "create-issue" },
  },
  {
    type: "run-job",
    label: "Run Job",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "jobName", label: "Job Name", kind: "string", required: true },
    ],
    defaults: { type: "run-job" },
  },
  {
    type: "send-notification",
    label: "Send Notification",
    fields: [
      { key: "condition", label: "Condition", kind: "string" },
      { key: "notificationTemplate", label: "Template", kind: "string" },
    ],
    defaults: { type: "send-notification" },
  },
];

export const JOB_DEPENDENCY_FIELDS: FieldDef[] = [
  { key: "jobName", label: "Job Name", kind: "string", required: true },
  { key: "requireSuccessful", label: "Require Successful", kind: "boolean" },
  { key: "artifacts", label: "Artifacts", kind: "string" },
  { key: "destinationPath", label: "Destination Path", kind: "string" },
];

export const PROJECT_DEPENDENCY_FIELDS: FieldDef[] = [
  { key: "projectPath", label: "Project Path", kind: "string", required: true },
  {
    key: "buildProvider.type",
    label: "Build Provider",
    kind: "enum",
    enumValues: ["last-finished", "specified"],
  },
  { key: "buildProvider.buildNumber", label: "Build Number", kind: "number" },
  { key: "artifacts", label: "Artifacts", kind: "string" },
  { key: "destinationPath", label: "Destination Path", kind: "string" },
];

export function findTypeDef(types: readonly TypeDef[], type: string | undefined): TypeDef | undefined {
  return types.find((t) => t.type === type);
}

export function stepDisplayName(step: Record<string, unknown>): string {
  const name = step.name;
  if (typeof name === "string" && name.trim()) {
    return name;
  }
  const type = typeof step.type === "string" ? step.type : "step";
  return type;
}

export function stepConditionLabel(step: Record<string, unknown>): string {
  const condition = step.condition;
  if (typeof condition === "string" && condition.trim()) {
    return condition;
  }
  return "Unspecified";
}

export function groupedTypeLabel(typeDef: TypeDef): string {
  if (typeDef.group) {
    return `${typeDef.group} / ${typeDef.label}`;
  }
  return typeDef.label;
}

export function triggerDescription(item: Record<string, unknown>): string {
  const type = typeof item.type === "string" ? item.type : "";
  return findTypeDef(TRIGGER_TYPES, type)?.label ?? type;
}

export function triggerParamCount(item: Record<string, unknown>): number {
  const matrix = item.paramMatrix;
  return Array.isArray(matrix) ? matrix.length : 0;
}

export function polymorphicSummary(item: Record<string, unknown>, types: TypeDef[]): string {
  const type = typeof item.type === "string" ? item.type : "";
  const def = findTypeDef(types, type);
  const name =
    typeof item.name === "string"
      ? item.name
      : typeof item.jobName === "string"
        ? item.jobName
        : typeof item.projectPath === "string"
          ? item.projectPath
          : "";
  if (name) {
    return name;
  }
  return def?.label ?? type ?? "No Name";
}

/** Stub job suggestions (plugins not wired — UI parity only). */
export const STUB_JOB_SUGGESTIONS: { name: string; steps: Record<string, unknown>[] }[] = [];
