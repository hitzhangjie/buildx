import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type AgentStatus = "online" | "offline";

export type Agent = {
  id: number;
  name: string;
  os: string;
  osVersion: string;
  arch: string;
  ipAddress: string;
  cpuCount: number;
  paused: boolean;
  online: boolean;
  cpuLoad?: number;
  memTotal?: number;
  memFree?: number;
  diskTotal?: number;
  diskFree?: number;
  lastActiveDate?: string;
  attributes?: Record<string, string>;
  agentVersion?: string;
};

export type AgentLogEntry = {
  date: string;
  message: string;
};

export type JobExecutor = {
  name: string;
  type: string;
  enabled: boolean;
  jobMatch?: string;
};

/** @deprecated use name — kept for mock rows */
export type JobExecutorLegacy = JobExecutor & { id?: number };

/** Mock agents for development without a running server. */
const MOCK_AGENTS: Agent[] = [
  {
    id: 1,
    name: "agent-01",
    os: "Linux",
    osVersion: "Ubuntu 22.04",
    arch: "x86_64",
    ipAddress: "192.168.1.101",
    cpuCount: 4,
    paused: false,
    online: true,
    cpuLoad: 0.45,
    memTotal: 8192,
    memFree: 4096,
    diskTotal: 102400,
    diskFree: 65536,
    lastActiveDate: new Date().toISOString(),
    agentVersion: "1.0.0",
    attributes: { "location": "us-east-1", "pool": "default" },
  },
  {
    id: 2,
    name: "agent-02",
    os: "Linux",
    osVersion: "Debian 12",
    arch: "arm64",
    ipAddress: "192.168.1.102",
    cpuCount: 8,
    paused: false,
    online: true,
    cpuLoad: 0.22,
    memTotal: 16384,
    memFree: 12288,
    diskTotal: 512000,
    diskFree: 409600,
    lastActiveDate: new Date().toISOString(),
    agentVersion: "1.0.0",
    attributes: { "location": "eu-west-1", "pool": "large" },
  },
  {
    id: 3,
    name: "agent-03",
    os: "macOS",
    osVersion: "Sequoia 15.0",
    arch: "x86_64",
    ipAddress: "192.168.1.103",
    cpuCount: 2,
    paused: true,
    online: false,
    cpuLoad: 0,
    memTotal: 4096,
    memFree: 2048,
    diskTotal: 256000,
    diskFree: 128000,
    lastActiveDate: new Date(Date.now() - 86400000 * 3).toISOString(),
    agentVersion: "1.0.0",
    attributes: { "location": "local", "pool": "default" },
  },
];

const MOCK_EXECUTORS: JobExecutor[] = [
  { name: "server-docker", type: "Server Docker", enabled: true, jobMatch: "*" },
  { name: "server-shell", type: "Server Shell", enabled: true, jobMatch: "*" },
  { name: "kubernetes", type: "Kubernetes", enabled: false, jobMatch: "*" },
];

export async function queryAgents(
  query?: string,
  offset?: number,
  count?: number,
): Promise<Agent[]> {
  if (USE_MOCK) {
    let result = [...MOCK_AGENTS];
    if (query) {
      const q = query.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.os.toLowerCase().includes(q) ||
          a.arch.toLowerCase().includes(q) ||
          a.ipAddress.includes(q),
      );
    }
    if (offset !== undefined) result = result.slice(offset);
    if (count !== undefined) result = result.slice(0, count);
    return result;
  }
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (offset !== undefined) params.set("offset", String(offset));
  if (count !== undefined) params.set("count", String(count));
  const qs = params.toString();
  const data = await apiFetch<Agent[] | null>(
    `/~api/agents${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function getAgent(id: number): Promise<Agent> {
  if (USE_MOCK) {
    const found = MOCK_AGENTS.find((a) => a.id === id);
    if (!found) throw { status: 404, message: "Agent not found" };
    return found;
  }
  return apiFetch<Agent>(`/~api/agents/${id}`);
}

export async function getAgentAttributes(
  id: number,
): Promise<Record<string, string>> {
  if (USE_MOCK) {
    const found = MOCK_AGENTS.find((a) => a.id === id);
    return found?.attributes ?? {};
  }
  return apiFetch<Record<string, string>>(`/~api/agents/${id}/attributes`);
}

export async function updateAgentAttributes(
  id: number,
  attrs: Record<string, string>,
): Promise<void> {
  if (USE_MOCK) {
    const found = MOCK_AGENTS.find((a) => a.id === id);
    if (found) found.attributes = attrs;
    return;
  }
  await apiFetch<void>(`/~api/agents/${id}/attributes`, {
    method: "POST",
    body: JSON.stringify(attrs),
  });
}

export async function getAgentToken(
  id: number,
): Promise<{ token: string }> {
  if (USE_MOCK) {
    return { token: "mock-agent-token-" + id };
  }
  return apiFetch<{ token: string }>(`/~api/agents/${id}/token`);
}

export async function regenerateAgentToken(
  id: number,
): Promise<{ token: string }> {
  if (USE_MOCK) {
    return { token: "mock-agent-token-" + id + "-new" };
  }
  return apiFetch<{ token: string }>(`/~api/agents/${id}/token`, {
    method: "POST",
  });
}

export async function deleteAgent(id: number): Promise<void> {
  if (USE_MOCK) {
    const idx = MOCK_AGENTS.findIndex((a) => a.id === id);
    if (idx === -1) throw { status: 404, message: "Agent not found" };
    MOCK_AGENTS.splice(idx, 1);
    return;
  }
  await apiFetch<void>(`/~api/agents/${id}`, { method: "DELETE" });
}

export async function pauseAgent(id: number): Promise<void> {
  if (USE_MOCK) {
    const found = MOCK_AGENTS.find((a) => a.id === id);
    if (found) found.paused = true;
    return;
  }
  await apiFetch<void>(`/~api/agents/${id}/pause`, { method: "POST" });
}

export async function resumeAgent(id: number): Promise<void> {
  if (USE_MOCK) {
    const found = MOCK_AGENTS.find((a) => a.id === id);
    if (found) found.paused = false;
    return;
  }
  await apiFetch<void>(`/~api/agents/${id}/resume`, { method: "POST" });
}

export async function getAgentLogEntries(
  id: number,
  offset?: number,
  count?: number,
): Promise<AgentLogEntry[]> {
  if (USE_MOCK) {
    return [
      { date: new Date(Date.now() - 3600000).toISOString(), message: "Agent started" },
      { date: new Date(Date.now() - 1800000).toISOString(), message: "Job assigned: build-123" },
      { date: new Date(Date.now() - 600000).toISOString(), message: "Job completed: build-123" },
    ].slice(offset ?? 0, count ? (offset ?? 0) + count : undefined);
  }
  const params = new URLSearchParams();
  if (offset !== undefined) params.set("offset", String(offset));
  if (count !== undefined) params.set("count", String(count));
  const qs = params.toString();
  const data = await apiFetch<AgentLogEntry[] | null>(
    `/~api/agents/${id}/log${qs ? `?${qs}` : ""}`,
  );
  return Array.isArray(data) ? data : [];
}

export async function queryJobExecutors(): Promise<JobExecutor[]> {
  if (USE_MOCK) {
    return [...MOCK_EXECUTORS];
  }
  const data = await apiFetch<JobExecutor[] | null>("/~api/settings/job-executors");
  return Array.isArray(data) ? data : [];
}

export async function saveJobExecutors(executors: JobExecutor[]): Promise<void> {
  if (USE_MOCK) {
    MOCK_EXECUTORS.splice(0, MOCK_EXECUTORS.length, ...executors);
    return;
  }
  await apiFetch<void>("/~api/settings/job-executors", {
    method: "POST",
    body: JSON.stringify(
      executors.map((e) => ({
        name: e.name,
        enabled: e.enabled,
        jobMatch: e.jobMatch,
      })),
    ),
  });
}

export async function toggleJobExecutor(name: string, enabled: boolean): Promise<void> {
  if (USE_MOCK) {
    const found = MOCK_EXECUTORS.find((e) => e.name === name);
    if (found) found.enabled = enabled;
    return;
  }
  const current = await queryJobExecutors();
  const next = current.map((e) => (e.name === name ? { ...e, enabled } : e));
  await saveJobExecutors(next);
}

export async function suggestJobExecutors(params: {
  projectPath?: string;
  branch?: string;
  jobName?: string;
}): Promise<string[]> {
  if (USE_MOCK) {
    if (!params.jobName) {
      return [];
    }
    return MOCK_EXECUTORS.filter((e) => e.enabled).map((e) => e.name);
  }
  const qs = new URLSearchParams();
  if (params.projectPath) qs.set("projectPath", params.projectPath);
  if (params.branch) qs.set("branch", params.branch);
  if (params.jobName) qs.set("jobName", params.jobName);
  const data = await apiFetch<string[] | null>(`/~api/buildspec/suggest-job-executors?${qs}`);
  return Array.isArray(data) ? data : [];
}
