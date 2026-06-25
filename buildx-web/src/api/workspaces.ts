import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockWorkspaces, type Workspace, type WorkspaceStatus } from "../mocks/fixtures/workspaces";

export type { Workspace, WorkspaceStatus };

export interface WorkspaceQueryParams {
  query?: string;
  offset?: number;
  count?: number;
  status?: string;
  branch?: string;
  spec?: string;
}

export interface WorkspaceCreateData {
  branch?: string;
  commitHash?: string;
  specName: string;
}

/** Fetch workspaces globally (across all projects). */
export async function fetchWorkspaces(params?: WorkspaceQueryParams): Promise<Workspace[]> {
  if (USE_MOCK) {
    return mockWorkspaces;
  }
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set("query", params.query);
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  if (params?.count !== undefined) searchParams.set("count", String(params.count));
  if (params?.status) searchParams.set("status", params.status);

  const qs = searchParams.toString();
  const data = await apiFetch<Workspace[] | null>(`/~api/workspaces${qs ? `?${qs}` : ""}`);
  return Array.isArray(data) ? data : [];
}

/** Fetch workspaces for a specific project. */
export async function fetchProjectWorkspaces(
  projectId: number,
  params?: WorkspaceQueryParams,
): Promise<Workspace[]> {
  if (USE_MOCK) {
    return mockWorkspaces;
  }
  const searchParams = new URLSearchParams();
  if (params?.query) searchParams.set("query", params.query);
  if (params?.offset !== undefined) searchParams.set("offset", String(params.offset));
  if (params?.count !== undefined) searchParams.set("count", String(params.count));
  if (params?.status) searchParams.set("status", params.status);
  if (params?.branch) searchParams.set("branch", params.branch);
  if (params?.spec) searchParams.set("spec", params.spec);

  const qs = searchParams.toString();
  const data = await apiFetch<Workspace[] | null>(
    `/~api/projects/${projectId}/workspaces${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(data) ? data : [];
}

/** Get a single workspace by project ID and workspace number. */
export async function fetchWorkspace(
  projectId: number,
  workspaceNumber: number,
): Promise<Workspace> {
  if (USE_MOCK) {
    throw new Error("Mock workspace detail not available");
  }
  return apiFetch<Workspace>(`/~api/projects/${projectId}/workspaces/${workspaceNumber}`);
}

/** Create a new workspace. */
export async function createWorkspace(
  projectId: number,
  data: WorkspaceCreateData,
): Promise<Workspace> {
  if (USE_MOCK) {
    throw new Error("Mock workspace creation not available");
  }
  return apiFetch<Workspace>(`/~api/projects/${projectId}/workspaces`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

/** Delete a workspace. */
export async function deleteWorkspace(
  projectId: number,
  workspaceNumber: number,
): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch<void>(`/~api/projects/${projectId}/workspaces/${workspaceNumber}`, {
    method: "DELETE",
  });
}

/** Reset (reprovision) a workspace. */
export async function resetWorkspace(
  projectId: number,
  workspaceNumber: number,
): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch<void>(`/~api/projects/${projectId}/workspaces/${workspaceNumber}/reset`, {
    method: "POST",
  });
}

/** Status badge CSS class mapping. */
export function workspaceStatusBadgeClass(status: WorkspaceStatus): string {
  switch (status) {
    case "ACTIVE":
      return "badge badge-light-success";
    case "PENDING":
      return "badge badge-light-warning";
    case "INACTIVE":
      return "badge badge-light-secondary";
  }
}
