// DEFAULT_REVISION is empty — the server resolves the actual default branch
// (e.g. main, master) via git symbolic-ref HEAD. Sending an empty revision
// lets the server pick the correct branch regardless of git init settings.
export const DEFAULT_REVISION = "";

/** Blob page mode — matches OneDev's BlobRenderContext.Mode */
export type BlobMode = "view" | "add" | "edit" | "delete" | "upload";

export function parseBlobSegments(segments: string[]): { revision: string; path: string } {
  if (segments.length === 0) {
    return { revision: DEFAULT_REVISION, path: "" };
  }
  // Revision is encoded in the URL path so that branch names with slashes
  // (e.g. feat/commitgraph → feat%2Fcommitgraph) remain as a single segment.
  return {
    revision: decodeURIComponent(segments[0]),
    path: segments.slice(1).join("/"),
  };
}

export function blobUrl(
  projectPath: string,
  revision: string,
  path: string,
  mode?: BlobMode,
  extraParams?: Record<string, string>,
): string {
  // Encode revision so branch names with slashes (e.g. feat/commitgraph)
  // stay as a single URL path segment (feat%2Fcommitgraph).
  const base = `/${projectPath}/~files/${encodeURIComponent(revision)}`;
  let url = path ? `${base}/${path}` : base;

  const params = new URLSearchParams();
  if (mode && mode !== "view") {
    params.set("mode", mode);
  }
  if (extraParams) {
    for (const [key, val] of Object.entries(extraParams)) {
      params.set(key, val);
    }
  }
  const qs = params.toString();
  if (qs) {
    url += `?${qs}`;
  }
  return url;
}

/** Permanent link for a text selection in a file view. */
export function blobSelectionUrl(
  projectPath: string,
  revision: string,
  path: string,
  position: string,
): string {
  return blobUrl(projectPath, revision, path, "view", { position });
}

/**
 * Generate the URL for creating a new file in the given directory.
 * Puts the page in ADD mode with an optional initial path.
 */
export function blobAddUrl(
  projectPath: string,
  revision: string,
  directory?: string,
  initialPath?: string,
): string {
  const path = directory ?? "";
  const extra: Record<string, string> = {};
  if (initialPath) {
    extra.initialPath = initialPath;
  }
  return blobUrl(projectPath, revision, path, "add", initialPath ? extra : undefined);
}

export function parentBlobUrl(projectPath: string, revision: string, path: string): string | null {
  if (!path) {
    return null;
  }
  const parts = path.split("/");
  parts.pop();
  return blobUrl(projectPath, revision, parts.join("/"));
}

export function fileIcon(name: string, type: "file" | "directory"): string {
  if (type === "directory") {
    return "folder";
  }
  if (name.endsWith(".go")) {
    return "code";
  }
  if (name.endsWith(".md")) {
    return "file";
  }
  if (name.endsWith(".yml") || name.endsWith(".yaml")) {
    return "yaml";
  }
  return "file";
}
