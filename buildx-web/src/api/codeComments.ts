import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";
import type { PlanarRange } from "../util/planarRange";

export type CodeCommentMark = {
  commitHash: string;
  path: string;
  range: PlanarRange;
};

export type CodeComment = {
  id: number;
  projectId: number;
  content: string;
  createDate: string;
  replyCount: number;
  resolved: boolean;
  uuid: string;
  mark: CodeCommentMark;
  user?: {
    id: number;
    name: string;
    fullName?: string;
  };
};

export async function fetchCodeComments(
  projectPath: string,
  commitHash: string,
  path: string,
): Promise<CodeComment[]> {
  if (USE_MOCK) {
    return [];
  }
  const query = new URLSearchParams({ commitHash, path });
  return apiFetch<CodeComment[]>(
    `/~api/projects/${encodeURIComponent(projectPath)}/code-comments?${query}`,
  );
}

export async function fetchCodeComment(commentId: number): Promise<CodeComment> {
  return apiFetch<CodeComment>(`/~api/code-comments/${commentId}`);
}

export async function createCodeComment(input: {
  projectId: number;
  content: string;
  mark: CodeCommentMark;
}): Promise<CodeComment> {
  return apiFetch<CodeComment>("/~api/code-comments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteCodeComment(commentId: number): Promise<void> {
  await apiFetch(`/~api/code-comments/${commentId}`, { method: "DELETE" });
}
