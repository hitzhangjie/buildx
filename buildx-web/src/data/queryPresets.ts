import type { SavedQuery } from "../components/onedev/panels/SavedQueriesPanel";

export const BUILD_COMMON_QUERIES: SavedQuery[] = [
  { name: "All", query: "" },
  { name: "Successful", query: '"Status" is Successful' },
  { name: "Failed", query: '"Status" is Failed' },
  { name: "Cancelled", query: '"Status" is Cancelled' },
  { name: "Timed out", query: '"Status" is "Timed Out"' },
  { name: "Running", query: '"Status" is Running' },
  { name: "Waiting", query: '"Status" is Waiting' },
  { name: "Pending", query: '"Status" is Pending' },
  { name: "Build recently", query: 'order by "Finish Date" desc' },
];

export const PROJECT_COMMON_QUERIES: SavedQuery[] = [
  { name: "All", query: "", href: "/~projects" },
  { name: "Roots", query: "roots", href: "/~projects?query=roots" },
];

export function buildProjectScopedHref(
  basePath: string,
  query: string,
): string {
  if (!query.trim()) {
    return basePath;
  }
  const separator = basePath.includes("?") ? "&" : "?";
  return `${basePath}${separator}query=${encodeURIComponent(query)}`;
}
