import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import { getMockBlob, type BlobContent } from "../mocks/fixtures/blob";

export type { BlobContent, BlobEntry, BlobCommitInfo } from "../mocks/fixtures/blob";

export async function fetchBlob(
  projectPath: string,
  revision: string,
  path: string,
): Promise<BlobContent | null> {
  if (USE_MOCK) {
    return getMockBlob(revision, path);
  }
  try {
    const query = new URLSearchParams({ revision, path });
    return await apiFetch<BlobContent>(
      `/~api/projects/${encodeURIComponent(projectPath)}/blob?${query}`,
    );
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return null;
    }
    throw err;
  }
}
