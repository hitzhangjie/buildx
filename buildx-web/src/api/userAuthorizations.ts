import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export interface ProjectAuthorizationBean {
  projectPath: string;
  roleNames: string[];
}

/** Project-level user authorization row (one user + assigned roles). */
export interface UserAuthorizationBean {
  userName: string;
  roleNames: string[];
}

const MOCK_AUTHORIZATIONS: ProjectAuthorizationBean[] = [];
const MOCK_PROJECT_AUTHORIZATIONS: UserAuthorizationBean[] = [];

export async function fetchUserAuthorizations(
  userId: number,
): Promise<ProjectAuthorizationBean[]> {
  if (USE_MOCK) {
    return [...MOCK_AUTHORIZATIONS];
  }
  const data = await apiFetch<ProjectAuthorizationBean[] | null>(
    `/~api/users/${userId}/authorizations`,
  );
  return Array.isArray(data) ? data : [];
}

export async function syncUserAuthorizations(
  userId: number,
  beans: ProjectAuthorizationBean[],
): Promise<void> {
  if (USE_MOCK) {
    MOCK_AUTHORIZATIONS.length = 0;
    MOCK_AUTHORIZATIONS.push(...beans);
    return;
  }
  await apiFetch(`/~api/users/${userId}/authorizations`, {
    method: "PUT",
    body: JSON.stringify(beans),
  });
}

/** Fetch user authorizations for a specific project. */
export async function fetchProjectUserAuthorizations(
  projectId: number,
): Promise<UserAuthorizationBean[]> {
  if (USE_MOCK) {
    return [...MOCK_PROJECT_AUTHORIZATIONS];
  }
  const data = await apiFetch<UserAuthorizationBean[] | null>(
    `/~api/projects/${projectId}/user-authorizations`,
  );
  return Array.isArray(data) ? data : [];
}

/** Sync (replace) user authorizations for a specific project. */
export async function syncProjectUserAuthorizations(
  projectId: number,
  beans: UserAuthorizationBean[],
): Promise<void> {
  if (USE_MOCK) {
    MOCK_PROJECT_AUTHORIZATIONS.length = 0;
    MOCK_PROJECT_AUTHORIZATIONS.push(...beans);
    return;
  }
  await apiFetch(`/~api/projects/${projectId}/user-authorizations`, {
    method: "PUT",
    body: JSON.stringify(beans),
  });
}
