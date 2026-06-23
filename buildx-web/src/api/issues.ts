import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockIssues, type Issue } from "../mocks/fixtures/issues";

export type { Issue };

export async function fetchIssues(): Promise<Issue[]> {
  if (USE_MOCK) {
    return mockIssues;
  }
  try {
    const data = await apiFetch<Issue[] | null>("/~api/issues");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
