import { fetchBranch } from "../api/repositories";

function hashesMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  if (shorter.length < 7) return false;
  return longer.startsWith(shorter);
}

/** Map each selected branch's tip commit to its branch name(s). */
export async function buildBranchLabelsByHash(
  projectId: number,
  branchNames: string[],
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (branchNames.length === 0) return map;

  const results = await Promise.allSettled(
    branchNames.map((name) => fetchBranch(projectId, name)),
  );

  for (let i = 0; i < branchNames.length; i++) {
    const result = results[i];
    if (result.status !== "fulfilled") continue;

    const hash = result.value.commitHash;
    const names = map.get(hash) ?? [];
    names.push(branchNames[i]);
    map.set(hash, names);
  }

  return map;
}

export function branchLabelsForCommit(
  commitHash: string,
  labelsByHash: Map<string, string[]>,
): string[] {
  for (const [hash, names] of labelsByHash) {
    if (hashesMatch(commitHash, hash)) return names;
  }
  return [];
}
