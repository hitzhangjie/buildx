import { apiFetch, authHeader } from "./client";

export type BranchRef = {
  refName: string;
  commitHash: string;
  updated?: string;
};

export async function fetchBranches(projectId: number): Promise<string[]> {
  const data = await apiFetch<string[] | null>(`/~api/repositories/${projectId}/branches`);
  return Array.isArray(data) ? data : [];
}

export async function fetchDefaultBranch(projectId: number): Promise<string | null> {
  const response = await fetch(`/~api/repositories/${projectId}/default-branch`, {
    headers: authHeader(),
  });
  if (response.status === 204) {
    return null;
  }
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string };
      message = body.error ?? message;
    } catch {
      /* ignore */
    }
    throw { status: response.status, message } satisfies import("./client").ApiError;
  }
  return (await response.json()) as string;
}

export async function fetchBranch(projectId: number, branch: string): Promise<BranchRef> {
  return apiFetch<BranchRef>(
    `/~api/repositories/${projectId}/branches/${encodeURIComponent(branch)}`,
  );
}
