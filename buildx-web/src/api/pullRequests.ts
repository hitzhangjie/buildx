import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockPullRequests, type PullRequest } from "../mocks/fixtures/pullRequests";

export type { PullRequest };

export async function fetchPullRequests(): Promise<PullRequest[]> {
  if (USE_MOCK) {
    return mockPullRequests;
  }
  try {
    const data = await apiFetch<PullRequest[] | null>("/~api/pull-requests");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
