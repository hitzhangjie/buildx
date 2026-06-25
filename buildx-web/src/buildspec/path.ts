export const BUILD_SPEC_PATH = ".onedev-buildspec.yml";
export const LEGACY_BUILD_SPEC_PATH = ".onedev-buildspec";

export function isBuildSpecPath(path: string): boolean {
  return path === BUILD_SPEC_PATH || path === LEGACY_BUILD_SPEC_PATH;
}
