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

export type CodeCommentReply = {
  id: number;
  commentId: number;
  content: string;
  createDate: string;
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

export async function fetchProjectCodeComments(projectPath: string): Promise<CodeComment[]> {
  if (USE_MOCK) {
    return [];
  }
  return apiFetch<CodeComment[]>(`/~api/projects/${encodeURIComponent(projectPath)}/code-comments`);
}

/** Comments anchored on either side of a revision compare (old/new commit hashes). */
export async function fetchCompareCodeComments(
  projectPath: string,
  oldCommitHash: string,
  newCommitHash: string,
): Promise<CodeComment[]> {
  if (USE_MOCK) {
    return [];
  }
  const query = new URLSearchParams({
    oldCommitHash,
    newCommitHash,
  });
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

export async function fetchCodeCommentReplies(commentId: number): Promise<CodeCommentReply[]> {
  return apiFetch<CodeCommentReply[]>(`/~api/code-comments/${commentId}/replies`);
}

export async function createCodeCommentReply(commentId: number, content: string): Promise<CodeCommentReply> {
  return apiFetch<CodeCommentReply>(`/~api/code-comments/${commentId}/replies`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}

export async function setCodeCommentResolved(commentId: number, resolved: boolean): Promise<CodeComment> {
  return apiFetch<CodeComment>(`/~api/code-comments/${commentId}/resolved`, {
    method: "POST",
    body: JSON.stringify({ resolved }),
  });
}
