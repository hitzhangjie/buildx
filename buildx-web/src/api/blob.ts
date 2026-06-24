import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import {
  getMockBlob,
  createMockFile,
  updateMockFile,
  deleteMockFile,
  type BlobContent,
} from "../mocks/fixtures/blob";

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

/**
 * Create a new file in the repository.
 * Matches OneDev's RepositoryResource.editFile (POST) with FileCreateOrUpdateRequest.
 */
export async function createFile(
  projectPath: string,
  revision: string,
  path: string,
  content: string,
  commitMessage: string,
): Promise<void> {
  if (USE_MOCK) {
    createMockFile(revision, path, content, commitMessage);
    return;
  }
  const bytes = new TextEncoder().encode(content);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  await apiFetch(`/~api/projects/${encodeURIComponent(projectPath)}/files/${encodeURIComponent(revision)}/${encodeURIComponent(path)}`, {
    method: "POST",
    body: JSON.stringify({
      commitMessage,
      base64Content: btoa(binary),
    }),
  });
}

/**
 * Update an existing file in the repository.
 */
export async function updateFile(
  projectPath: string,
  revision: string,
  path: string,
  content: string,
  commitMessage: string,
): Promise<void> {
  if (USE_MOCK) {
    updateMockFile(revision, path, content, commitMessage);
    return;
  }
  const bytes = new TextEncoder().encode(content);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  await apiFetch(`/~api/projects/${encodeURIComponent(projectPath)}/files/${encodeURIComponent(revision)}/${encodeURIComponent(path)}`, {
    method: "POST",
    body: JSON.stringify({
      commitMessage,
      base64Content: btoa(binary),
    }),
  });
}

/**
 * Delete a file from the repository.
 * Matches OneDev's RepositoryResource.editFile with commit message only.
 */
export async function deleteFile(
  projectPath: string,
  revision: string,
  path: string,
  commitMessage: string,
): Promise<void> {
  if (USE_MOCK) {
    deleteMockFile(revision, path, commitMessage);
    return;
  }
  await apiFetch(`/~api/projects/${encodeURIComponent(projectPath)}/files/${encodeURIComponent(revision)}/${encodeURIComponent(path)}`, {
    method: "POST",
    body: JSON.stringify({ commitMessage }),
  });
}

/** URL to download a file as an attachment. */
export function blobDownloadUrl(
  projectPath: string,
  revision: string,
  path: string,
): string {
  const query = new URLSearchParams({
    revision,
    path,
    disposition: "attachment",
  });
  return `/~api/projects/${encodeURIComponent(projectPath)}/raw?${query}`;
}
