/** BuildSpec model aligned with buildx-server/internal/buildspec (OneDev BuildSpec.java). */

export type BuildSpecStep = Record<string, unknown> & {
  type?: string;
  name?: string;
};

export type JobDependency = {
  jobName?: string;
  requireSuccessful?: boolean;
  artifacts?: string[];
};

export type Job = {
  name?: string;
  jobExecutor?: string;
  steps?: BuildSpecStep[];
  paramSpecs?: Record<string, unknown>[];
  jobDependencies?: JobDependency[];
  projectDependencies?: Record<string, unknown>[];
  requiredServices?: string[];
  triggers?: Record<string, unknown>[];
  timeout?: number;
  postBuildActions?: Record<string, unknown>[];
  sequentialGroup?: string;
  retryCondition?: string;
  maxRetries?: number;
  retryDelay?: number;
};

export type Service = {
  name?: string;
  image?: string;
  command?: string;
  envVars?: Record<string, string>;
  ports?: number[];
  readyCommand?: string;
};

export type StepTemplate = {
  name?: string;
  steps?: BuildSpecStep[];
  paramSpecs?: Record<string, unknown>[];
};

export type JobProperty = {
  name?: string;
  value?: string;
};

export type BuildSpecImport = {
  projectPath?: string;
  tag?: string;
  revision?: string;
  accessTokenSecret?: string;
};

export type BuildSpec = {
  version?: number;
  jobs?: Job[];
  services?: Service[];
  stepTemplates?: StepTemplate[];
  properties?: JobProperty[];
  imports?: BuildSpecImport[];
};

export type BuildSpecTab = "jobs" | "services" | "stepTemplates" | "properties" | "imports";

export function emptyBuildSpec(): BuildSpec {
  return {
    version: 2,
    jobs: [],
    services: [],
    stepTemplates: [],
    properties: [],
    imports: [],
  };
}

export function namedElementLabel(name: string | undefined): string {
  return name?.trim() ? name : "No Name";
}
