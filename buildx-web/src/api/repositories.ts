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

export type CommitPerson = {
  name: string;
  emailAddress?: string;
  when: number;
  tzOffset?: number;
};

export type RepositoryCommit = {
  hash: string;
  subject?: string;
  body?: string;
  author?: CommitPerson;
  committer?: CommitPerson;
  parentHashes?: string[];
};

export async function fetchCommits(
  projectId: number,
  params?: { count?: number; revision?: string },
): Promise<RepositoryCommit[]> {
  const query = new URLSearchParams();
  query.set("count", String(params?.count ?? 100));
  if (params?.revision) {
    query.set("revision", params.revision);
  }
  const data = await apiFetch<RepositoryCommit[] | null>(
    `/~api/repositories/${projectId}/commits?${query}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function fetchCommit(
  projectId: number,
  commitHash: string,
): Promise<RepositoryCommit> {
  return apiFetch<RepositoryCommit>(
    `/~api/repositories/${projectId}/commits/${encodeURIComponent(commitHash)}`,
  );
}
