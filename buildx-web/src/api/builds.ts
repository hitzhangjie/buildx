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
  retryDate?: string;
  pendingDuration?: number;
  runningDuration?: number;
  submitReason?: string;
  submitSequence?: number;
  submitter?: BuildUser;
  canceller?: BuildUser;
  paused?: boolean;
  uuid?: string;
  workDirPath?: string;
  checkoutPaths?: string[];
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

export type BuildDependence = {
  id: number;
  dependentId: number;
  dependencyId: number;
  requireSuccessful: boolean;
  artifacts?: string;
  destinationPath?: string;
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

export async function getBuildDependencies(buildId: number): Promise<BuildDependence[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<BuildDependence[] | null>(`/~api/builds/${buildId}/dependencies`);
  return Array.isArray(data) ? data : [];
}

export async function getBuildDependents(buildId: number): Promise<BuildDependence[]> {
  if (USE_MOCK) {
    return [];
  }
  const data = await apiFetch<BuildDependence[] | null>(`/~api/builds/${buildId}/dependents`);
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

export type LogEntry = {
  id: number;
  buildId?: number;
  stepName?: string;
  message: string;
  /** Backend uses level for both severity and stream (stdout/stderr/info/warn/error). */
  level: string;
  timestamp: string;
};

export type BuildArtifact = {
  id: number;
  name: string;
  path: string;
  size: number;
  type: string;
  buildId: number;
};

export type BuildChange = {
  commitHash: string;
  message: string;
  author: string;
  authorDate: string;
  files: { path: string; type: "added" | "modified" | "deleted" | "renamed" }[];
};

export type SubmitBuildRequest = {
  projectId: number;
  commitHash: string;
  jobName: string;
  refName: string;
  params?: Record<string, string[]>;
  reason?: string;
  pullRequestId?: number;
  issueId?: number;
};

export async function submitBuild(data: SubmitBuildRequest): Promise<Build> {
  if (USE_MOCK) {
    throw new Error("submitBuild not implemented in mock mode");
  }
  return apiFetch<Build>("/~api/job-runs", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function rerunBuild(
  buildId: number,
  reason: string,
): Promise<Build> {
  if (USE_MOCK) {
    const found = mockBuilds.find((b) => b.id === buildId);
    if (!found) throw { status: 404, message: "Build not found" };
    return { ...found, status: "PENDING" };
  }
  return apiFetch<Build>("/~api/job-runs/rebuild", {
    method: "POST",
    body: JSON.stringify({ buildId, reason }),
  });
}

export async function cancelBuild(buildId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiFetch<void>(`/~api/builds/${buildId}/cancel`, {
    method: "POST",
  });
}

export async function pauseBuild(buildId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiFetch<void>(`/~api/builds/${buildId}/pause`, {
    method: "POST",
  });
}

export async function resumeBuild(buildId: number): Promise<void> {
  if (USE_MOCK) return;
  await apiFetch<void>(`/~api/builds/${buildId}/resume`, {
    method: "POST",
  });
}

export async function getBuildLog(buildId: number): Promise<LogEntry[]> {
  if (USE_MOCK) {
    return [
      {
        id: 1,
        stepName: "Checkout",
        message: "Cloning repository...",
        level: "info",
        timestamp: new Date().toISOString(),
      },
      {
        id: 2,
        stepName: "Build",
        message: "Compiling source code...",
        level: "stdout",
        timestamp: new Date().toISOString(),
      },
      {
        id: 3,
        stepName: "Test",
        message: "Running tests...\nAll tests passed!",
        level: "stdout",
        timestamp: new Date().toISOString(),
      },
    ];
  }
  const data = await apiFetch<LogEntry[] | null>(
    `/~api/builds/${buildId}/log`,
  );
  return Array.isArray(data) ? data : [];
}

export function streamBuildLog(buildId: number): EventSource {
  return new EventSource(`/~api/builds/${buildId}/log-stream`);
}

export async function getBuildArtifacts(
  buildId: number,
): Promise<BuildArtifact[]> {
  if (USE_MOCK) {
    return [
      {
        id: 1,
        name: "app.jar",
        path: "build/libs/app.jar",
        size: 24576000,
        type: "application/java-archive",
        buildId,
      },
      {
        id: 2,
        name: "Dockerfile",
        path: "Dockerfile",
        size: 512,
        type: "text/plain",
        buildId,
      },
      {
        id: 3,
        name: "reports.zip",
        path: "build/reports/reports.zip",
        size: 1048576,
        type: "application/zip",
        buildId,
      },
    ];
  }
  const data = await apiFetch<BuildArtifact[] | null>(
    `/~api/builds/${buildId}/artifacts`,
  );
  return Array.isArray(data) ? data : [];
}

export async function getBuildChanges(
  buildId: number,
): Promise<BuildChange[]> {
  if (USE_MOCK) {
    return [
      {
        commitHash: "a1b2c3d4e5f6789012345678901234567890abcd",
        message: "Fix bug in CI pipeline",
        author: "developer@example.com",
        authorDate: new Date(Date.now() - 3600000).toISOString(),
        files: [
          { path: "src/main/java/App.java", type: "modified" },
          { path: "src/test/java/AppTest.java", type: "modified" },
        ],
      },
      {
        commitHash: "1234567890abcdef1234567890abcdef12345678",
        message: "Add new feature",
        author: "contributor@example.com",
        authorDate: new Date(Date.now() - 7200000).toISOString(),
        files: [
          { path: "src/main/java/Feature.java", type: "added" },
          { path: "src/main/java/FeatureTest.java", type: "added" },
          { path: "docs/feature.md", type: "added" },
        ],
      },
    ];
  }
  const data = await apiFetch<BuildChange[] | null>(
    `/~api/builds/${buildId}/changes`,
  );
  return Array.isArray(data) ? data : [];
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
