import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import {
  mockPacks,
  type Pack,
  type PackBlob,
  type PackLabel,
} from "../mocks/fixtures/packs";

export type { Pack, PackBlob, PackLabel };

/** Fetch the global (non-project-scoped) package list. */
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

/** Query packages with text query, offset, and count. */
export async function queryPacks(
  query: string,
  offset = 0,
  count = 50,
): Promise<Pack[]> {
  if (USE_MOCK) {
    // Simple client-side filtering for mock data
    if (!query) return mockPacks.slice(offset, offset + count);
    const q = query.toLowerCase();
    return mockPacks
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.type.toLowerCase().includes(q) ||
          p.version.toLowerCase().includes(q),
      )
      .slice(offset, offset + count);
  }
  try {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    params.set("offset", String(offset));
    params.set("count", String(count));
    const data = await apiFetch<Pack[] | null>(
      `/~api/packages?${params.toString()}`,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}

/** Get a single pack by ID. */
export async function fetchPack(id: number): Promise<Pack | null> {
  if (USE_MOCK) {
    return mockPacks.find((p) => p.id === id) ?? null;
  }
  try {
    return await apiFetch<Pack>(`/~api/packages/${id}`);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return null;
    }
    throw err;
  }
}

/** Delete a pack by ID. */
export async function deletePack(id: number): Promise<void> {
  if (USE_MOCK) {
    const idx = mockPacks.findIndex((p) => p.id === id);
    if (idx >= 0) mockPacks.splice(idx, 1);
    return;
  }
  await apiFetch(`/~api/packages/${id}`, { method: "DELETE" });
}

/** Get labels for a pack. */
export async function fetchPackLabels(id: number): Promise<PackLabel[]> {
  if (USE_MOCK) {
    const pack = mockPacks.find((p) => p.id === id);
    return pack?.labels ?? [];
  }
  try {
    const data = await apiFetch<PackLabel[] | null>(
      `/~api/packages/${id}/labels`,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}

/** Create a label on a pack. */
export async function createPackLabel(
  packId: number,
  labelName: string,
  color?: string,
): Promise<PackLabel | null> {
  if (USE_MOCK) {
    const pack = mockPacks.find((p) => p.id === packId);
    if (!pack) return null;
    const newLabel: PackLabel = {
      id: Date.now(),
      name: labelName,
      color: color ?? "#6c757d",
    };
    pack.labels.push(newLabel);
    return newLabel;
  }
  try {
    return await apiFetch<PackLabel>("/~api/package-labels", {
      method: "POST",
      body: JSON.stringify({ packId, name: labelName, color }),
    });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return null;
    }
    throw err;
  }
}

/** Delete a label. */
export async function deletePackLabel(labelId: number): Promise<void> {
  if (USE_MOCK) {
    for (const pack of mockPacks) {
      const idx = pack.labels.findIndex((l) => l.id === labelId);
      if (idx >= 0) {
        pack.labels.splice(idx, 1);
        return;
      }
    }
    return;
  }
  try {
    await apiFetch(`/~api/package-labels/${labelId}`, { method: "DELETE" });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return;
    }
    throw err;
  }
}

/** Get blobs for a pack. */
export async function fetchPackBlobs(id: number): Promise<PackBlob[]> {
  if (USE_MOCK) {
    const pack = mockPacks.find((p) => p.id === id);
    return pack?.blobs ?? [];
  }
  try {
    const data = await apiFetch<PackBlob[] | null>(
      `/~api/packages/${id}/blobs`,
    );
    return Array.isArray(data) ? data : [];
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return [];
    }
    throw err;
  }
}
