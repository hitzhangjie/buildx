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

// --- Project detail and update (OneDev ProjectData DTO) ---

export type ProjectDetail = Project & {
  codeManagement: boolean;
  packManagement: boolean;
  issueManagement: boolean;
  timeTracking: boolean;
  serviceDeskEmailAddress?: string;
  parentId?: number;
};

export type UpdateProjectRequest = {
  name: string;
  key?: string;
  description?: string;
  codeManagement?: boolean;
  packManagement?: boolean;
  issueManagement?: boolean;
  timeTracking?: boolean;
  serviceDeskEmailAddress?: string;
  parentId?: number | null;
};

/**
 * Fetch a single project with all fields. Matches OneDev GET /~api/projects/{projectId}.
 */
export async function fetchProject(projectId: number): Promise<ProjectDetail> {
  if (USE_MOCK) {
    const project = mockProjects.find((p) => p.id === projectId);
    if (!project) throw { status: 404, message: "Project not found" };
    return {
      ...project,
      codeManagement: true,
      packManagement: true,
      issueManagement: true,
      timeTracking: false,
    };
  }
  return apiFetch<ProjectDetail>(`/~api/projects/${projectId}`);
}

/**
 * Update project general info. Matches OneDev POST /~api/projects/{projectId}.
 */
export async function updateProject(
  projectId: number,
  data: UpdateProjectRequest
): Promise<ProjectDetail> {
  if (USE_MOCK) {
    const idx = mockProjects.findIndex((p) => p.id === projectId);
    if (idx === -1) throw { status: 404, message: "Project not found" };
    const existing = mockProjects[idx];
    if (data.name) existing.name = data.name;
    if (data.key !== undefined) existing.key = data.key;
    if (data.description !== undefined) existing.description = data.description;
    return {
      ...existing,
      codeManagement: data.codeManagement ?? true,
      packManagement: data.packManagement ?? true,
      issueManagement: data.issueManagement ?? true,
      timeTracking: data.timeTracking ?? false,
      serviceDeskEmailAddress: data.serviceDeskEmailAddress,
      parentId: data.parentId ?? undefined,
    };
  }
  return apiFetch<ProjectDetail>(`/~api/projects/${projectId}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// --- Settings types (mirrors Go model/project_setting.go) ---

export type ProjectSetting = {
  branchProtections?: BranchProtection[];
  tagProtections?: TagProtection[];
  issueSetting?: IssueSetting;
  buildSetting?: BuildSetting;
  pullRequestSetting?: PullRequestSetting;
  packSetting?: PackSetting;
  workspaceSetting?: WorkspaceSetting;
  namedCommitQueries?: NamedCommitQuery[];
  namedCodeCommentQueries?: NamedCodeCommentQuery[];
  webHooks?: WebHook[];
  contributedSettings?: Record<string, unknown>;
  gitPackConfig?: GitPackConfig;
  codeAnalysisSetting?: CodeAnalysisSetting;
  aiSetting?: AiSetting;
  workspaceSpecs?: WorkspaceSpec[];
};

export type BranchProtection = {
  enabled: boolean;
  branches: string;
  userMatch?: string;
  preventForcedPush: boolean;
  preventDeletion: boolean;
  preventCreation: boolean;
  commitSignatureRequired: boolean;
  reviewRequirement?: string;
  jobNames?: string[];
  requireStrictBuilds: boolean;
};

export type TagProtection = {
  enabled: boolean;
  tags: string;
  userMatch?: string;
  preventUpdate: boolean;
  preventDeletion: boolean;
  preventCreation: boolean;
  commitSignatureRequired: boolean;
};

export type IssueSetting = {
  listFields?: string[];
  listLinks?: string[];
  boardSpecs?: { name: string; baseQuery?: string; backlogBaseQuery?: string; identifyField: string; columns: string[] }[];
  namedQueries?: { name: string; query: string }[];
  transitionSpecs?: { fromStates: string[]; toState: string; trigger?: string; authorized?: string }[];
  branchPrefix?: string;
};

export type JobProperty = { name: string; value: string };
export type JobSecret = { name: string; value?: string; authorization?: string; archived: boolean };
export type BuildPreservation = { condition: string; count: number };
export type DefaultFixedIssueFilter = { query: string };

export type BuildSetting = {
  listParams?: string[];
  namedQueries?: { name: string; query: string }[];
  jobProperties?: JobProperty[];
  jobSecrets?: JobSecret[];
  buildPreservations?: BuildPreservation[];
  defaultFixedIssueFilters?: DefaultFixedIssueFilter[];
  cachePreserveDays?: number;
};

export type PullRequestSetting = {
  namedQueries?: { name: string; query: string }[];
  defaultMergeStrategy?: string;
  defaultAssignees?: string[];
  deleteSourceBranchAfterMerge?: boolean;
};

export type PackSetting = {
  namedQueries?: { name: string; query: string }[];
};

export type WorkspaceSetting = {
  namedQueries?: { name: string; query: string }[];
};

export type WebHook = {
  id: number;
  postUrl: string;
  eventTypes: string[];
  secret?: string;
  headers?: { name: string; value: string }[];
  enabled: boolean;
};

export type GitPackConfig = {
  windowMemory?: string;
  packSizeLimit?: string;
  threads?: string;
  window?: string;
};

export type CodeAnalysisSetting = {
  analysisFiles?: string;
};

export type AiSetting = {
  enabled: boolean;
  model?: string;
};

export type WorkspaceSpec = {
  name: string;
  description?: string;
  image: string;
  shell?: string;
  runInContainer?: boolean;
};

export type NamedCommitQuery = {
  name: string;
  query?: string;
};

export type NamedCodeCommentQuery = {
  name: string;
  query?: string;
};

/**
 * Fetch all project settings. Matches OneDev GET /~api/projects/{projectId}/setting.
 */
export async function fetchProjectSettings(
  projectId: number
): Promise<ProjectSetting> {
  if (USE_MOCK) {
    return {};
  }
  return apiFetch<ProjectSetting>(`/~api/projects/${projectId}/setting`);
}

/**
 * Update all project settings. Matches OneDev POST /~api/projects/{projectId}/setting.
 */
export async function updateProjectSettings(
  projectId: number,
  settings: ProjectSetting
): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch<void>(`/~api/projects/${projectId}/setting`, {
    method: "POST",
    body: JSON.stringify(settings),
  });
}

/**
 * Upload a project avatar. POST /~api/projects/{projectId}/avatar (multipart).
 */
export async function uploadProjectAvatar(
  projectId: number,
  file: File
): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  const formData = new FormData();
  formData.append("avatar", file);
  await apiFetch<void>(`/~api/projects/${projectId}/avatar`, {
    method: "POST",
    body: formData,
    // Don't set Content-Type — browser will set it with boundary for multipart.
  });
}

/**
 * Get the project avatar URL.
 */
export function projectAvatarUrl(projectId: number): string {
  if (USE_MOCK) {
    return "/~img/default-avatar.png";
  }
  return `/~api/projects/${projectId}/avatar?t=${Date.now()}`;
}
