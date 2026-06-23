import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockWorkspaces, type Workspace } from "../mocks/fixtures/workspaces";

export type { Workspace };

export async function fetchWorkspaces(): Promise<Workspace[]> {
  if (USE_MOCK) {
    return mockWorkspaces;
  }
  try {
    const data = await apiFetch<Workspace[] | null>("/~api/workspaces");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
