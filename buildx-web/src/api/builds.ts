import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockBuilds, type Build } from "../mocks/fixtures/builds";

export type { Build };

export async function fetchBuilds(): Promise<Build[]> {
  if (USE_MOCK) {
    return mockBuilds;
  }
  try {
    const data = await apiFetch<Build[] | null>("/~api/builds");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
