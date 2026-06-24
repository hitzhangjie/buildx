import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockIssues } from "../mocks/fixtures/issues";
import type { Project } from "./projects";
import { fetchProjects } from "./projects";

export type IssueUser = {
  id: number;
  name: string;
  fullName: string;
};

export type IssueProject = {
  id: number;
  name: string;
  path: string;
  key: string;
};

export type Issue = {
  id: number;
  projectId: number;
  project?: IssueProject;
  number: number;
  title: string;
  description: string;
  state: string;
  stateOrdinal: number;
  submitter?: IssueUser;
  submitDate: string;
  voteCount: number;
  commentCount: number;
  confidential: boolean;
};

export type IssueComment = {
  id: number;
  issueId: number;
  user?: IssueUser;
  content: string;
  createDate: string;
  revisionCount: number;
};

export type CreateIssueRequest = {
  projectId: number;
  title: string;
  description?: string;
  confidential?: boolean;
  iterationIds?: number[];
};

export function stateBadgeColor(state: string): "light-warning" | "light-primary" | "light-success" {
  switch (state) {
    case "Open":
      return "light-warning";
    case "Closed":
      return "light-success";
    case "In Progress":
    case "In Review":
      return "light-primary";
    default:
      return "light-primary";
  }
}

export function formatIssueDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }
  return date.toLocaleString();
}

export function buildProjectIssueQuery(projectPath: string, userQuery?: string): string {
  const projectClause = `"Project" is "${projectPath}"`;
  const trimmed = userQuery?.trim();
  if (!trimmed) {
    return projectClause;
  }
  if (trimmed.includes('"Project"')) {
    return trimmed;
  }
  return `${projectClause} and ${trimmed}`;
}

export function buildNumberQuery(projectPath: string, number: number): string {
  return `"Number" is "${projectPath}#${number}"`;
}

async function resolveProjectId(projectPath: string): Promise<Project> {
  const projects = await fetchProjects();
  const project = projects.find((p) => p.path === projectPath);
  if (!project) {
    throw { status: 404, message: "Project not found" } satisfies import("./client").ApiError;
  }
  return project;
}

export async function fetchIssues(query?: string, offset = 0, count = 100): Promise<Issue[]> {
  if (USE_MOCK) {
    return mockIssues;
  }
  const params = new URLSearchParams();
  if (query) {
    params.set("query", query);
  }
  params.set("offset", String(offset));
  params.set("count", String(count));
  const data = await apiFetch<Issue[] | null>(`/~api/issues?${params}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchProjectIssues(
  projectPath: string,
  userQuery?: string,
  opts?: { iterationId?: number; unscheduledOnly?: boolean },
): Promise<Issue[]> {
  if (USE_MOCK) {
    return mockIssues;
  }
  const project = await resolveProjectId(projectPath);
  let query = buildProjectIssueQuery(projectPath, userQuery);
  if (opts?.unscheduledOnly) {
    query = buildProjectIssueQuery(projectPath, `"Iteration" is empty`);
  }
  const params = new URLSearchParams();
  params.set("query", query);
  params.set("projectId", String(project.id));
  if (opts?.iterationId) {
    params.set("iterationId", String(opts.iterationId));
  }
  params.set("offset", "0");
  params.set("count", "500");
  const data = await apiFetch<Issue[] | null>(`/~api/issues?${params}`);
  return Array.isArray(data) ? data : [];
}

export async function fetchIssueByNumber(projectPath: string, number: number): Promise<Issue | null> {
  if (USE_MOCK) {
    return mockIssues.find((i) => i.project?.path === projectPath && i.number === number) ?? null;
  }
  const issues = await fetchIssues(buildNumberQuery(projectPath, number));
  return issues[0] ?? null;
}

export async function fetchIssue(issueId: number): Promise<Issue> {
  return apiFetch<Issue>(`/~api/issues/${issueId}`);
}

export async function createIssue(req: CreateIssueRequest): Promise<number> {
  if (USE_MOCK) {
    const id = Date.now();
    mockIssues.push({
      id,
      projectId: req.projectId,
      number: mockIssues.length + 1,
      title: req.title,
      description: req.description ?? "",
      state: "Open",
      stateOrdinal: 0,
      submitDate: new Date().toISOString(),
      voteCount: 0,
      commentCount: 0,
      confidential: req.confidential ?? false,
    });
    return id;
  }
  return apiFetch<number>("/~api/issues", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function createProjectIssue(
  projectPath: string,
  title: string,
  description?: string,
  opts?: { iterationIds?: number[] },
): Promise<{ id: number; number: number }> {
  const project = await resolveProjectId(projectPath);
  const id = await createIssue({
    projectId: project.id,
    title,
    description,
    iterationIds: opts?.iterationIds,
  });
  const issue = await fetchIssue(id);
  return { id, number: issue.number };
}

export async function fetchIssueComments(issueId: number): Promise<IssueComment[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<IssueComment[] | null>(`/~api/issues/${issueId}/comments`);
  return Array.isArray(data) ? data : [];
}

export async function createIssueComment(issueId: number, content: string): Promise<number> {
  if (USE_MOCK) {
    return Date.now();
  }
  return apiFetch<number>("/~api/issue-comments", {
    method: "POST",
    body: JSON.stringify({
      issue: { id: issueId },
      content,
    }),
  });
}

export async function updateIssueTitle(issueId: number, title: string): Promise<void> {
  await apiFetch<void>(`/~api/issues/${issueId}/title`, {
    method: "POST",
    body: JSON.stringify(title),
  });
}

export async function updateIssueDescription(issueId: number, description: string): Promise<void> {
  await apiFetch<void>(`/~api/issues/${issueId}/description`, {
    method: "POST",
    body: JSON.stringify(description),
  });
}

export async function transitionIssueState(issueId: number, state: string, comment?: string): Promise<void> {
  await apiFetch<void>(`/~api/issues/${issueId}/state-transitions`, {
    method: "POST",
    body: JSON.stringify({ state, comment: comment ?? "" }),
  });
}

export async function deleteIssue(issueId: number): Promise<void> {
  await apiFetch<void>(`/~api/issues/${issueId}`, { method: "DELETE" });
}

export async function fetchIssueIterations(issueId: number): Promise<import("./iterations").Iteration[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<import("./iterations").Iteration[] | null>(
    `/~api/issues/${issueId}/iterations`,
  );
  return Array.isArray(data) ? data : [];
}

export async function setIssueIterations(issueId: number, iterationIds: number[]): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch<void>(`/~api/issues/${issueId}/iterations`, {
    method: "POST",
    body: JSON.stringify(iterationIds),
  });
}
