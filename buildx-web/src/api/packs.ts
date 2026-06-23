import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { mockPacks, type Pack } from "../mocks/fixtures/packs";

export type { Pack };

export async function fetchPacks(): Promise<Pack[]> {
  if (USE_MOCK) {
    return mockPacks;
  }
  try {
    const data = await apiFetch<Pack[] | null>("/~api/packs");
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
