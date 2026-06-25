import { parse as parseYaml, stringify as stringifyYaml } from "yaml";
import { emptyBuildSpec, type BuildSpec } from "./types";

function normalizeBuildSpec(raw: unknown): BuildSpec {
  const spec = (raw && typeof raw === "object" ? raw : {}) as BuildSpec;
  return {
    version: spec.version ?? 2,
    jobs: spec.jobs ?? [],
    services: spec.services ?? [],
    stepTemplates: spec.stepTemplates ?? [],
    properties: spec.properties ?? [],
    imports: spec.imports ?? [],
  };
}

export function parseBuildSpecYaml(content: string): { spec: BuildSpec } | { error: string } {
  const trimmed = content.trim();
  if (!trimmed) {
    return { spec: emptyBuildSpec() };
  }
  try {
    const parsed = parseYaml(content);
    return { spec: normalizeBuildSpec(parsed) };
  } catch (err) {
    return { error: (err as Error).message || String(err) };
  }
}

export function serializeBuildSpecYaml(spec: BuildSpec): string {
  const doc: Record<string, unknown> = {};
  if (spec.version != null) {
    doc.version = spec.version;
  }
  if (spec.imports?.length) {
    doc.imports = spec.imports;
  }
  if (spec.jobs?.length) {
    doc.jobs = spec.jobs;
  }
  if (spec.services?.length) {
    doc.services = spec.services;
  }
  if (spec.stepTemplates?.length) {
    doc.stepTemplates = spec.stepTemplates;
  }
  if (spec.properties?.length) {
    doc.properties = spec.properties;
  }
  return stringifyYaml(doc, { lineWidth: 0 }).trimEnd() + "\n";
}
