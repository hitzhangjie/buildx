import type { User } from "../api/users";
import { USE_MOCK } from "../mocks/config";

const ROOT_USER_ID = 1;

/** Mirrors OneDev SecurityUtils.isAdministrator() until group/role permissions are ported. */
export function isAdministrator(user: User | null): boolean {
  if (!user) {
    return false;
  }
  if (USE_MOCK) {
    return true;
  }
  return user.id === ROOT_USER_ID;
}
