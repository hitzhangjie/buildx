import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockBuilds } from "../mocks/fixtures/builds";

export type BuildStatus =
  | "WAITING"
  | "PENDING"
  | "RUNNING"
  | "FAILED"
  | "CANCELLED"
  | "TIMED_OUT"
  | "SUCCESSFUL";

export type BuildUser = {
  id: number;
  name: string;
  fullName?: string;
};

export type BuildProject = {
  id: number;
  name: string;
  path: string;
  key?: string;
};

export type Build = {
  id: number;
  projectId: number;
  project?: BuildProject;
  numberScopeId?: number;
  number: number;
  jobName: string;
  status: BuildStatus;
  refName: string;
  commitHash: string;
  version?: string;
  description?: string;
  submitDate: string;
  pendingDate?: string;
  runningDate?: string;
  finishDate?: string;
  pendingDuration?: number;
  runningDuration?: number;
  submitReason?: string;
  submitter?: BuildUser;
  canceller?: BuildUser;
  paused?: boolean;
  uuid?: string;
};

export type BuildLabel = {
  id: number;
  buildId: number;
  name: string;
};

export type BuildParam = {
  id: number;
  buildId: number;
  name: string;
  type: string;
  value: string;
};

export type QueryBuildsOptions = {
  query?: string;
  offset?: number;
  count?: number;
  projectId?: number;
};

function buildQueryString(opts: QueryBuildsOptions): string {
  const params = new URLSearchParams();
  if (opts.query) {
    params.set("query", opts.query);
  }
  if (opts.offset !== undefined) {
    params.set("offset", String(opts.offset));
  }
  if (opts.count !== undefined) {
    params.set("count", String(opts.count));
  }
  if (opts.projectId !== undefined) {
    params.set("projectId", String(opts.projectId));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function queryBuilds(opts: QueryBuildsOptions = {}): Promise<Build[]> {
  if (USE_MOCK) {
    return filterMockBuilds(mockBuilds, opts);
  }
  const data = await apiFetch<Build[] | null>(`/~api/builds${buildQueryString(opts)}`);
  return Array.isArray(data) ? data : [];
}

/** @deprecated Use queryBuilds instead */
export async function fetchBuilds(): Promise<Build[]> {
  return queryBuilds();
}

export async function getBuild(buildId: number): Promise<Build> {
  if (USE_MOCK) {
    const found = mockBuilds.find((b) => b.id === buildId);
    if (!found) {
      throw new Error("Build not found");
    }
    return found;
  }
  return apiFetch<Build>(`/~api/builds/${buildId}`);
}

export async function getBuildByNumber(
  projectPath: string,
  number: number,
): Promise<Build | null> {
  const builds = await queryBuilds({
    query: `"Number" is "${projectPath}#${number}"`,
    count: 1,
  });
  return builds[0] ?? null;
}

export async function getBuildLabels(buildId: number): Promise<BuildLabel[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<BuildLabel[] | null>(`/~api/builds/${buildId}/labels`);
  return Array.isArray(data) ? data : [];
}

export async function getBuildParams(buildId: number): Promise<BuildParam[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<BuildParam[] | null>(`/~api/builds/${buildId}/params`);
  return Array.isArray(data) ? data : [];
}

export async function setBuildDescription(buildId: number, description: string): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch(`/~api/builds/${buildId}/description`, {
    method: "POST",
    body: description,
    headers: { "Content-Type": "text/plain" },
  });
}

export async function deleteBuild(buildId: number): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch(`/~api/builds/${buildId}`, { method: "DELETE" });
}

function filterMockBuilds(builds: Build[], opts: QueryBuildsOptions): Build[] {
  let result = [...builds];
  if (opts.projectId !== undefined) {
    result = result.filter((b) => b.projectId === opts.projectId);
  }
  if (opts.query) {
    const q = opts.query.toLowerCase();
    result = result.filter(
      (b) =>
        b.jobName.toLowerCase().includes(q) ||
        String(b.number).includes(q) ||
        (b.project?.path ?? "").toLowerCase().includes(q),
    );
  }
  return result;
}
