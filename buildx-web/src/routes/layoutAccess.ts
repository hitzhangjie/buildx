import { matchPath } from "react-router-dom";
import { GLOBAL_ROUTES } from "./globalRoutes";
import type { RouteDefinition } from "./types";

/**
 * OneDev LayoutPage.isPermitted():
 *   getLoginUser() != null || securitySetting.isEnableAnonymousAccess()
 *
 * SimplePage routes (layout "simple") use BasePage default isPermitted() === true.
 */
export function findGlobalRoute(pathname: string): RouteDefinition | undefined {
  return GLOBAL_ROUTES.find((def) => matchPath({ path: def.path, end: true }, pathname));
}

export function isSimplePageRoute(pathname: string): boolean {
  const def = findGlobalRoute(pathname);
  return def?.layout === "simple";
}

export function isLayoutPagePermitted(
  user: unknown,
  enableAnonymousAccess: boolean,
): boolean {
  return user != null || enableAnonymousAccess;
}
