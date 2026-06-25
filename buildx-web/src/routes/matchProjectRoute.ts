import { PROJECT_ROUTE_SUFFIXES_SORTED } from "./projectRoutes";
import type { MatchedProjectRoute } from "./types";

function suffixToRegex(suffix: string): RegExp | null {
  if (suffix === "") {
    return null;
  }
  const escaped = suffix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = escaped.replace(/:([A-Za-z][A-Za-z0-9_-]*)/g, (_, name: string) => {
    return `(?<${name.replace(/-/g, "_")}>[^/]+)`;
  });
  return new RegExp(`^${pattern}$`);
}

const compiled = PROJECT_ROUTE_SUFFIXES_SORTED.map((def) => ({
  def,
  regex: suffixToRegex(def.suffix),
}));

/** Match project-scoped URLs like `/foo/bar/~issues/1`. */
export function matchProjectRoute(pathname: string): MatchedProjectRoute | null {
  if (pathname.startsWith("/~") || pathname.startsWith("/projects/")) {
    return null;
  }

  const normalized = pathname.replace(/\/+$/, "") || "/";
  if (normalized === "/") {
    return null;
  }

  const tildeIndex = normalized.indexOf("/~");
  const projectPath =
    tildeIndex === -1 ? normalized.slice(1) : normalized.slice(1, tildeIndex);
  const suffix = tildeIndex === -1 ? "" : normalized.slice(tildeIndex);

  if (!projectPath) {
    return null;
  }

  if (suffix === "/~files" || suffix.startsWith("/~files/")) {
    const blobDef = compiled.find((entry) => entry.def.suffix === "/~files")?.def;
    if (blobDef) {
      const blobSegments =
        suffix === "/~files"
          ? []
          : suffix.slice("/~files/".length).split("/").filter(Boolean);
      return { projectPath, def: blobDef, params: {}, blobSegments };
    }
  }

  // Exact literal suffix match takes priority over parameterized regex matches.
  // This prevents /~pulls/new from being captured by /~pulls/:request,
  // /~issues/new from being captured by /~issues/:issue, etc.
  const exactMatch = compiled.find(({ def }) => def.suffix === suffix);
  if (exactMatch) {
    return { projectPath, def: exactMatch.def, params: {} };
  }

  for (const { def, regex } of compiled) {
    if (regex && regex.test(suffix)) {
      const match = suffix.match(regex);
      const params: Record<string, string> = {};
      if (match?.groups) {
        for (const [key, value] of Object.entries(match.groups)) {
          if (value !== undefined) {
            params[key.replace(/_/g, "-")] = value;
          }
        }
      }
      return { projectPath, def, params };
    }
  }

  return null;
}
