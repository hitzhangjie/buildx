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

export type CreateProjectRequest = {
  name: string;
  key?: string;
  description?: string;
  parentPath?: string;
};

export async function createProject(req: CreateProjectRequest): Promise<Project> {
  if (USE_MOCK) {
    const path = req.parentPath ? `${req.parentPath}/${req.name}` : req.name;
    const derivedKey =
      req.name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 10) || "PROJ";
    return {
      id: Date.now(),
      name: req.name,
      path,
      key: req.key ?? derivedKey,
      description: req.description,
    };
  }

  let parentId: number | undefined;
  if (req.parentPath) {
    const projects = await fetchProjects();
    const parent = projects.find((p) => p.path === req.parentPath);
    if (!parent) {
      throw { status: 404, message: "Parent project not found" } satisfies import("./client").ApiError;
    }
    parentId = parent.id;
  }

  return apiFetch<Project>("/~api/projects", {
    method: "POST",
    body: JSON.stringify({
      name: req.name,
      key: req.key,
      description: req.description,
      parentId,
    }),
  });
}
