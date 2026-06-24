import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { fetchProjects, type Project } from "./projects";

export type Iteration = {
  id: number;
  name: string;
  description?: string;
  startDay?: number;
  dueDay?: number;
  closed: boolean;
  scheduleCount?: number;
  project?: { id: number; path: string; name: string };
};

export type IterationStatus = "active" | "upcoming" | "closed";

export function iterationStatus(iter: Iteration): IterationStatus {
  if (iter.closed) {
    return "closed";
  }
  const today = epochDay(new Date());
  if (iter.startDay != null && iter.startDay > today) {
    return "upcoming";
  }
  return "active";
}

export function formatIterationDay(day?: number): string {
  if (day == null) {
    return "—";
  }
  const date = new Date(day * 86400000);
  return date.toISOString().slice(0, 10);
}

export function isoDateToEpochDay(iso: string): number {
  return epochDay(new Date(iso + "T00:00:00Z"));
}

function epochDay(date: Date): number {
  const utc = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  return Math.floor(utc / 86400000);
}

async function resolveProject(projectPath: string): Promise<Project> {
  const projects = await fetchProjects();
  const project = projects.find((p) => p.path === projectPath);
  if (!project) {
    throw { status: 404, message: "Project not found" } satisfies import("./client").ApiError;
  }
  return project;
}

export async function fetchProjectIterations(
  projectPath: string,
  opts?: { name?: string; closed?: boolean },
): Promise<Iteration[]> {
  if (USE_MOCK) {
    return [];
  }
  const project = await resolveProject(projectPath);
  const params = new URLSearchParams();
  if (opts?.name) {
    params.set("name", opts.name);
  }
  if (opts?.closed != null) {
    params.set("closed", String(opts.closed));
  }
  const qs = params.toString();
  const data = await apiFetch<Iteration[] | null>(
    `/~api/projects/${project.id}/iterations${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function createIteration(
  projectPath: string,
  name: string,
  startDate: string,
  dueDate: string,
): Promise<number> {
  if (USE_MOCK) {
    return Date.now();
  }
  const project = await resolveProject(projectPath);
  return apiFetch<number>("/~api/iterations", {
    method: "POST",
    body: JSON.stringify({
      project: { id: project.id },
      name,
      startDay: isoDateToEpochDay(startDate),
      dueDay: isoDateToEpochDay(dueDate),
      closed: false,
    }),
  });
}

export async function fetchIteration(iterationId: number): Promise<Iteration> {
  return apiFetch<Iteration>(`/~api/iterations/${iterationId}`);
}

export async function updateIteration(
  iterationId: number,
  data: {
    projectId: number;
    name: string;
    description?: string;
    startDay?: number;
    dueDay?: number;
    closed?: boolean;
  },
): Promise<number> {
  return apiFetch<number>(`/~api/iterations/${iterationId}`, {
    method: "POST",
    body: JSON.stringify({
      project: { id: data.projectId },
      name: data.name,
      description: data.description ?? "",
      startDay: data.startDay,
      dueDay: data.dueDay,
      closed: data.closed ?? false,
    }),
  });
}

export async function deleteIteration(iterationId: number): Promise<void> {
  await apiFetch<void>(`/~api/iterations/${iterationId}`, { method: "DELETE" });
}

export type IterationBurndown = {
  total: number;
  open: number;
  closed: number;
  byState: Record<string, number>;
};

export async function fetchIterationIssues(iterationId: number): Promise<import("./issues").Issue[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<import("./issues").Issue[] | null>(
    `/~api/iterations/${iterationId}/issues`,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchIterationBurndown(iterationId: number): Promise<IterationBurndown> {
  if (USE_MOCK) {
    return { total: 0, open: 0, closed: 0, byState: {} };
  }
  return apiFetch<IterationBurndown>(`/~api/iterations/${iterationId}/burndown`);
}
