import type { BuildSpec, Job } from "./types";

/** Built-in job variables — mirrors OneDev JobVariable enum (lowercase). */
const BUILTIN_JOB_VARIABLES = [
  "project_name",
  "project_path",
  "job_name",
  "job_token",
  "ref",
  "branch",
  "tag",
  "commit_hash",
  "build_number",
  "build_version",
  "build_id",
  "pull_request",
  "workspace",
  "server",
] as const;

export const JOB_VARIABLE_TIPS = (
  <>
    <b>Tips: </b> Type <code>@</code> to{" "}
    <a href="https://docs.onedev.io/appendix/job-variables" target="_blank" rel="noreferrer" tabIndex={-1}>
      insert variable
    </a>
    . Use <code>@@</code> for literal <code>@</code>
  </>
);

export function collectJobVariableSuggestions(
  buildSpec: BuildSpec,
  job: Job,
  matchWith: string,
): string[] {
  const q = matchWith.toLowerCase();
  const vars = new Set<string>();

  for (const name of BUILTIN_JOB_VARIABLES) {
    vars.add(name);
  }
  for (const ps of job.paramSpecs ?? []) {
    if (ps?.name) {
      vars.add(`param:${ps.name}`);
    }
  }
  for (const prop of buildSpec.properties ?? []) {
    if (prop?.name) {
      vars.add(`property:${prop.name}`);
    }
  }

  const out: string[] = [];
  for (const name of vars) {
    if (q === "" || name.toLowerCase().includes(q)) {
      out.push(name);
    }
  }
  out.sort((a, b) => a.localeCompare(b));
  return out.slice(0, 20);
}

export function jobExecutorPlaceholder(hasConfiguredExecutors: boolean): string {
  return hasConfiguredExecutors ? "First applicable executor" : "Auto-discovered executor";
}

export function jobExecutorDescription(hasConfiguredExecutors: boolean): string {
  const base = hasConfiguredExecutors
    ? "Optionally specify executor for this job. Leave empty to use first applicable executor"
    : "Optionally specify executor for this job. Leave empty to use auto-discover executor";
  return base;
}
