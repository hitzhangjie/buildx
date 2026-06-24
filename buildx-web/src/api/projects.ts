import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockProjects } from "../mocks/fixtures/projects";

export type ProjectStats = {
  fileCount: number;
  commitCount: number;
  branchCount: number;
  tagCount: number;
  workspaceCount: number;
};

export type Project = {
  id: number;
  name: string;
  path: string;
  key: string;
  description?: string;
  stats?: ProjectStats;
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
    const project: Project = {
      id: Date.now(),
      name: req.name,
      path,
      key: req.key ?? derivedKey,
      description: req.description,
    };
    mockProjects.push(project);
    return project;
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

/**
 * Move a project under a new parent. Pass targetParentId=null to make it a root project.
 * Matches OneDev's projectService.move().
 */
export async function moveProject(projectId: number, targetParentId: number | null): Promise<void> {
  if (USE_MOCK) {
    const project = mockProjects.find((p) => p.id === projectId);
    if (!project) throw { status: 404, message: "Project not found" };
    if (targetParentId === null) {
      // Make root project: strip any parent prefix from path
      project.path = project.name;
    } else {
      const parent = mockProjects.find((p) => p.id === targetParentId);
      if (!parent) throw { status: 404, message: "Target parent project not found" };
      project.path = `${parent.path}/${project.name}`;
    }
    return;
  }
  await apiFetch<void>(`/~api/projects/${projectId}/move`, {
    method: "POST",
    body: JSON.stringify({ parentId: targetParentId }),
  });
}

export type CloneUrl = {
  http: string;
  ssh: string;
};

/**
 * Fetch clone URLs (HTTP and SSH) for a project.
 * Matches OneDev's GET /~api/projects/{projectId}/clone-url.
 */
export async function fetchCloneUrl(projectId: number): Promise<CloneUrl> {
  if (USE_MOCK) {
    // In mock mode, we can't know the project path from just an ID.
    // Construct a reasonable fallback.
    const origin = window.location.origin;
    return { http: `${origin}/mock-project.git`, ssh: "" };
  }
  return apiFetch<CloneUrl>(`/~api/projects/${projectId}/clone-url`);
}

/**
 * Delete a single project. Matches OneDev's projectService.delete().
 */
export async function deleteProject(projectId: number): Promise<void> {
  if (USE_MOCK) {
    const idx = mockProjects.findIndex((p) => p.id === projectId);
    if (idx === -1) throw { status: 404, message: "Project not found" };
    mockProjects.splice(idx, 1);
    return;
  }
  await apiFetch<void>(`/~api/projects/${projectId}`, { method: "DELETE" });
}
