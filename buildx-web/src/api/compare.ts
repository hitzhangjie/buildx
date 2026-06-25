import { apiFetch } from "./client";
import type { FileDiff, RepositoryCommit } from "./repositories";
import type { PullRequest } from "./pullRequests";

export type CompareRevision = {
  revision: string;
  commitHash: string;
  subject?: string;
};

export type CompareMergePreview = {
  conflicted: boolean;
  mergeCommitHash?: string;
};

export type CompareResult = {
  left: CompareRevision;
  right: CompareRevision;
  mergeBase?: CompareRevision;
  effectivePullRequest?: PullRequest;
  mergePreview?: CompareMergePreview;
  commits?: RepositoryCommit[];
  diffs?: FileDiff[];
};

export type WhitespaceOption =
  | "IGNORE_TRAILING"
  | "IGNORE_LEADING"
  | "IGNORE_CHANGE"
  | "IGNORE_ALL"
  | "DO_NOT_IGNORE";

export const WHITESPACE_OPTIONS: { value: WhitespaceOption; label: string }[] = [
  { value: "IGNORE_TRAILING", label: "Ignore trailing whitespace" },
  { value: "IGNORE_LEADING", label: "Ignore leading whitespace" },
  { value: "IGNORE_CHANGE", label: "Ignore whitespace changes" },
  { value: "IGNORE_ALL", label: "Ignore all whitespace" },
  { value: "DO_NOT_IGNORE", label: "Do not ignore whitespace" },
];

export type CompareParams = {
  left: string;
  right: string;
  compareWithMergeBase?: boolean;
  includeCommits?: boolean;
  includeDiffs?: boolean;
  includeEffectivePullRequest?: boolean;
  includeMergePreview?: boolean;
  pathFilter?: string;
  whitespaceOption?: WhitespaceOption;
  count?: number;
};

export async function fetchCompare(
  projectId: number,
  params: CompareParams,
): Promise<CompareResult> {
  const query = new URLSearchParams();
  query.set("left", params.left);
  query.set("right", params.right);
  if (params.compareWithMergeBase !== undefined) {
    query.set("compare-with-merge-base", String(params.compareWithMergeBase));
  }
  if (params.includeCommits) {
    query.set("include-commits", "true");
  }
  if (params.includeDiffs) {
    query.set("include-diffs", "true");
  }
  if (params.includeEffectivePullRequest) {
    query.set("include-effective-pull-request", "true");
  }
  if (params.includeMergePreview) {
    query.set("include-merge-preview", "true");
  }
  if (params.pathFilter) {
    query.set("path-filter", params.pathFilter);
  }
  if (params.whitespaceOption && params.whitespaceOption !== "IGNORE_TRAILING") {
    query.set("whitespace-option", params.whitespaceOption);
  }
  if (params.count !== undefined) {
    query.set("count", String(params.count));
  }
  return apiFetch<CompareResult>(
    `/~api/repositories/${projectId}/compare?${query}`,
  );
}

export function comparePatchUrl(
  projectId: number,
  oldRevision: string,
  newRevision: string,
  whitespaceOption?: WhitespaceOption,
): string {
  const query = new URLSearchParams();
  query.set("old", oldRevision);
  query.set("new", newRevision);
  if (whitespaceOption && whitespaceOption !== "IGNORE_TRAILING") {
    query.set("whitespace-option", whitespaceOption);
  }
  return `/~api/repositories/${projectId}/compare/patch?${query}`;
}
