import { apiFetch } from "./client";

// Matches Go's git.Contribution
export type Contribution = {
  commits: number;
  additions: number;
  deletions: number;
};

// Map of epoch day → contribution counts
export type OverallContributions = Record<number, Contribution>;

// Map of epoch day → (language → net lines)
export type LineIncrements = Record<number, Record<string, number>>;

// Matches Go's git.Contributor
export type TopContributor = {
  authorName: string;
  authorEmailAddress: string;
  totalCommits: number;
  totalAdditions: number;
  totalDeletions: number;
  dailyContributions: Record<number, number>;
  authorAvatarUrl: string;
  commitsUrl: string;
  authorProfileUrl?: string;
};

/**
 * Fetch overall contribution data (per-day commits, additions, deletions)
 * for the default branch of a project.
 */
export async function fetchOverallContributions(
  projectId: number,
): Promise<OverallContributions> {
  return apiFetch<OverallContributions>(
    `/~api/projects/${projectId}/stats/code/overall-contributions`,
  );
}

/**
 * Fetch line increment data (per-day net lines by programming language)
 * for the default branch of a project.
 */
export async function fetchLineIncrements(
  projectId: number,
): Promise<LineIncrements> {
  return apiFetch<LineIncrements>(
    `/~api/projects/${projectId}/stats/code/line-increments`,
  );
}

/**
 * Fetch top contributors for a project within a date range.
 * @param projectId project ID
 * @param type contribution type: "COMMITS", "ADDITIONS", or "DELETIONS"
 * @param from epoch day start (inclusive)
 * @param to epoch day end (inclusive)
 */
export async function fetchTopContributors(
  projectId: number,
  type: string,
  from: number,
  to: number,
): Promise<TopContributor[]> {
  const params = new URLSearchParams({ type, from: String(from), to: String(to) });
  return apiFetch<TopContributor[]>(
    `/~api/projects/${projectId}/stats/code/top-contributors?${params}`,
  );
}
