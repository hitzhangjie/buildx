import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockProjects } from "../mocks/fixtures/projects";

export type Project = {
  id: number;
  name: string;
  path: string;
  key: string;
  description?: string;
};

export async function fetchProjects(): Promise<Project[]> {
  if (USE_MOCK) {
    return mockProjects;
  }
  try {
    const data = await apiFetch<Project[] | null>("/~api/projects");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 401 || status === 403) {
      return [];
    }
    throw err;
  }
}
