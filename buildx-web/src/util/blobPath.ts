export const DEFAULT_REVISION = "main";

export function parseBlobSegments(segments: string[]): { revision: string; path: string } {
  if (segments.length === 0) {
    return { revision: DEFAULT_REVISION, path: "" };
  }
  return {
    revision: segments[0],
    path: segments.slice(1).join("/"),
  };
}

export function blobUrl(projectPath: string, revision: string, path: string): string {
  const base = `/${projectPath}/~files/${revision}`;
  if (!path) {
    return base;
  }
  return `${base}/${path}`;
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
