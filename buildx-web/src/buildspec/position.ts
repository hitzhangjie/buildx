import type { BuildSpecTab } from "./types";

const POSITION_PREFIX = "buildspec-";

export function buildSpecPosition(selection: string | null | undefined): string | null {
  if (!selection) {
    return null;
  }
  return POSITION_PREFIX + selection;
}

export function parseBuildSpecSelection(position: string | null | undefined): string | null {
  if (!position?.startsWith(POSITION_PREFIX)) {
    return null;
  }
  return position.slice(POSITION_PREFIX.length);
}

export function tabFromSelection(selection: string | null): BuildSpecTab {
  if (!selection || selection.startsWith("jobs") || selection === "new-job") {
    return "jobs";
  }
  if (selection.startsWith("services") || selection === "new-service") {
    return "services";
  }
  if (selection.startsWith("step-templates") || selection === "new-step-template") {
    return "stepTemplates";
  }
  if (selection === "imports") {
    return "imports";
  }
  return "properties";
}

export function activeElementName(selection: string | null, segment: string): string | null {
  if (!selection) {
    return null;
  }
  const prefix = `${segment}/`;
  if (selection.startsWith(prefix)) {
    return selection.slice(prefix.length);
  }
  return null;
}

export function elementSelection(segment: string, name: string | undefined): string {
  if (name?.trim()) {
    return `${segment}/${name.trim()}`;
  }
  return segment.endsWith("s") ? segment : `${segment}s`;
}
