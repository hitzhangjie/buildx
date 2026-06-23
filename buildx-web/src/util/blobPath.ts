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
  return {
    revision: segments[0],
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
  const base = `/${projectPath}/~files/${revision}`;
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
