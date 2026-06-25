import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockPullRequests } from "../mocks/fixtures/pullRequests";
import type { Project } from "./projects";
import { fetchProjects } from "./projects";

export type PullRequestUser = {
  id: number;
  name: string;
  fullName?: string;
};

export type PullRequestProject = {
  id: number;
  name: string;
  path: string;
};

export type PullRequestStatus = "OPEN" | "MERGED" | "DISCARDED";

export type PullRequest = {
  id: number;
  number: number;
  title: string;
  description: string;
  status: PullRequestStatus;
  submitDate: string;
  closeDate?: string;
  targetProject?: PullRequestProject;
  sourceProject?: PullRequestProject;
  targetBranch: string;
  sourceBranch: string;
  submitter?: PullRequestUser;
  mergeStrategy?: string;
  baseCommitHash?: string;
  buildCommitHash?: string;
  commentCount: number;
  /** Convenience for global list rendering */
  projectPath?: string;
};

export type PullRequestComment = {
  id: number;
  requestId: number;
  content: string;
  createDate: string;
  user?: PullRequestUser;
};

export type PullRequestReview = {
  id: number;
  requestId: number;
  status: "PENDING" | "APPROVED" | "REQUESTED_FOR_CHANGES" | "EXCLUDED";
  date?: string;
  user?: PullRequestUser;
};

export type MergePreview = {
  headCommitHash: string;
  mergeCommitHash?: string;
  conflicted: boolean;
};

export type CreatePullRequestRequest = {
  targetProjectId: number;
  sourceProjectId: number;
  targetBranch: string;
  sourceBranch: string;
  title: string;
  description?: string;
  mergeStrategy?: string;
  reviewerIds?: number[];
  assigneeIds?: number[];
  labelIds?: string[];
};

const STATUS_LABEL: Record<PullRequestStatus, string> = {
  OPEN: "Open",
  MERGED: "Merged",
  DISCARDED: "Discarded",
};

const STATUS_BADGE: Record<PullRequestStatus, string> = {
  OPEN: "badge-light-warning",
  MERGED: "badge-light-success",
  DISCARDED: "badge-light-danger",
};

export function pullRequestStatusLabel(status: PullRequestStatus | string): string {
  return STATUS_LABEL[status as PullRequestStatus] ?? status;
}

export function pullRequestStatusBadge(status: PullRequestStatus | string): string {
  return STATUS_BADGE[status as PullRequestStatus] ?? "badge-light-primary";
}

export function buildProjectPullRequestQuery(projectPath: string, userQuery?: string): string {
  const projectClause = `"Target Project" is "${projectPath}"`;
  const trimmed = userQuery?.trim();
  if (!trimmed) {
    return projectClause;
  }
  if (trimmed.toLowerCase().includes("target project")) {
    return trimmed;
  }
  return `${projectClause} and ${trimmed}`;
}

export function buildPullRequestNumberQuery(projectPath: string, number: number): string {
  return `"Number" is "${projectPath}#${number}"`;
}

export function buildIncludesIssueQuery(projectPath: string, issueNumber: number): string {
  return `"Includes Issue" is "${projectPath}#${issueNumber}"`;
}

const MERGE_STRATEGY_LABEL: Record<string, string> = {
  CREATE_MERGE_COMMIT: "Create merge commit",
  CREATE_MERGE_COMMIT_IF_NECESSARY: "Create merge commit if necessary",
  SQUASH_SOURCE_BRANCH_COMMITS: "Squash source branch commits",
  REBASE_SOURCE_BRANCH_COMMITS: "Rebase source branch commits",
};

export function mergeStrategyLabel(strategy?: string): string {
  if (!strategy) {
    return MERGE_STRATEGY_LABEL.CREATE_MERGE_COMMIT_IF_NECESSARY;
  }
  return MERGE_STRATEGY_LABEL[strategy] ?? strategy;
}

function enrichPullRequest(pr: PullRequest): PullRequest {
  return {
    ...pr,
    projectPath: pr.targetProject?.path,
  };
}

async function resolveProject(projectPath: string): Promise<Project> {
  const projects = await fetchProjects();
  const project = projects.find((p) => p.path === projectPath);
  if (!project) {
    throw { status: 404, message: "Project not found" } satisfies import("./client").ApiError;
  }
  return project;
}

export async function fetchPullRequests(query?: string, offset = 0, count = 100): Promise<PullRequest[]> {
  if (USE_MOCK) {
    return mockPullRequests;
  }
  const params = new URLSearchParams();
  if (query) {
    params.set("query", query);
  }
  params.set("offset", String(offset));
  params.set("count", String(count));
  const data = await apiFetch<PullRequest[] | null>(`/~api/pulls?${params}`);
  const list = Array.isArray(data) ? data : [];
  return list.map(enrichPullRequest);
}

export async function fetchProjectPullRequests(projectPath: string, userQuery?: string): Promise<PullRequest[]> {
  return fetchPullRequests(buildProjectPullRequestQuery(projectPath, userQuery));
}

export async function fetchIssuePullRequests(projectPath: string, issueNumber: number): Promise<PullRequest[]> {
  return fetchPullRequests(buildIncludesIssueQuery(projectPath, issueNumber));
}

export async function fetchPullRequestByNumber(projectPath: string, number: number): Promise<PullRequest | null> {
  if (USE_MOCK) {
    return mockPullRequests.find((p) => p.projectPath === projectPath && p.number === number) ?? null;
  }
  const pulls = await fetchPullRequests(buildPullRequestNumberQuery(projectPath, number));
  return pulls[0] ? enrichPullRequest(pulls[0]) : null;
}

export async function fetchPullRequest(requestId: number): Promise<PullRequest> {
  const pr = await apiFetch<PullRequest>(`/~api/pulls/${requestId}`);
  return enrichPullRequest(pr);
}

export async function createPullRequest(req: CreatePullRequestRequest): Promise<number> {
  if (USE_MOCK) {
    return Date.now();
  }
  return apiFetch<number>("/~api/pulls", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function createProjectPullRequest(
  projectPath: string,
  title: string,
  sourceBranch: string,
  targetBranch: string,
  description?: string,
): Promise<{ id: number; number: number }> {
  const project = await resolveProject(projectPath);
  const id = await createPullRequest({
    targetProjectId: project.id,
    sourceProjectId: project.id,
    targetBranch,
    sourceBranch,
    title,
    description,
  });
  const pr = await fetchPullRequest(id);
  return { id, number: pr.number };
}

export async function fetchPullRequestComments(requestId: number): Promise<PullRequestComment[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<PullRequestComment[] | null>(`/~api/pulls/${requestId}/comments`);
  return Array.isArray(data) ? data : [];
}

export async function fetchPullRequestReviews(requestId: number): Promise<PullRequestReview[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<PullRequestReview[] | null>(`/~api/pulls/${requestId}/reviews`);
  return Array.isArray(data) ? data : [];
}

export type PullRequestAssignment = {
  id: number;
  requestId: number;
  user?: PullRequestUser;
};

export async function fetchPullRequestAssignments(requestId: number): Promise<PullRequestAssignment[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<PullRequestAssignment[] | null>(`/~api/pulls/${requestId}/assignments`);
  return Array.isArray(data) ? data : [];
}

export async function fetchPullRequestLabels(requestId: number): Promise<string[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<string[] | null>(`/~api/pulls/${requestId}/labels`);
  return Array.isArray(data) ? data : [];
}

export async function fetchMergePreview(requestId: number): Promise<MergePreview> {
  return apiFetch<MergePreview>(`/~api/pulls/${requestId}/merge-preview`);
}

export async function createPullRequestComment(requestId: number, content: string): Promise<PullRequestComment> {
  return apiFetch<PullRequestComment>("/~api/pull-request-comments", {
    method: "POST",
    body: JSON.stringify({ requestId, content }),
  });
}

export async function reviewPullRequest(
  requestId: number,
  status: "APPROVED" | "REQUESTED_FOR_CHANGES" | "PENDING" | "EXCLUDED",
  note?: string,
  userId?: number,
): Promise<void> {
  await apiFetch<void>("/~api/pull-request-reviews", {
    method: "POST",
    body: JSON.stringify({
      requestId,
      status,
      note: note ?? "",
      ...(userId ? { userId } : {}),
    }),
  });
}

export async function addPullRequestReviewer(requestId: number, userId: number): Promise<void> {
  await reviewPullRequest(requestId, "PENDING", undefined, userId);
}

export async function removePullRequestReviewer(requestId: number, userId: number): Promise<void> {
  await reviewPullRequest(requestId, "EXCLUDED", undefined, userId);
}

export async function updatePullRequestMergeStrategy(requestId: number, strategy: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/merge-strategy`, {
    method: "POST",
    body: JSON.stringify(strategy),
  });
}

export async function mergePullRequest(requestId: number, note?: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/merge`, {
    method: "POST",
    body: note ?? "",
  });
}

export async function discardPullRequest(requestId: number, note?: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/discard`, {
    method: "POST",
    body: note ?? "",
  });
}

export async function reopenPullRequest(requestId: number, note?: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/reopen`, {
    method: "POST",
    body: note ?? "",
  });
}

export async function updatePullRequestTitle(requestId: number, title: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/title`, {
    method: "POST",
    body: title,
  });
}

export async function updatePullRequestDescription(requestId: number, description: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/description`, {
    method: "POST",
    body: description,
  });
}

// --- Operations (Phase 3) ---

export async function deleteSourceBranch(requestId: number): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/delete-source-branch`, { method: "POST" });
}

export async function restoreSourceBranch(requestId: number): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/restore-source-branch`, { method: "POST" });
}

export async function synchronizePullRequest(requestId: number): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/synchronize`, { method: "POST" });
}

export async function changeTargetBranch(requestId: number, targetBranch: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/change-target-branch`, {
    method: "POST",
    body: targetBranch,
  });
}

export async function setAutoMerge(requestId: number, enabled: boolean, commitMessage?: string): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/auto-merge`, {
    method: "POST",
    body: JSON.stringify({ enabled, commitMessage: commitMessage ?? "" }),
  });
}

export async function updateSourceBranch(requestId: number, method: "merge" | "rebase"): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}/update-source-branch`, {
    method: "POST",
    body: method,
  });
}

export async function deletePullRequest(requestId: number): Promise<void> {
  await apiFetch<void>(`/~api/pulls/${requestId}`, { method: "DELETE" });
}
