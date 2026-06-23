import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type SecuritySetting = {
  enableAnonymousAccess: boolean;
};

const MOCK_SECURITY_SETTING: SecuritySetting = {
  enableAnonymousAccess: false,
};

export async function fetchSecuritySetting(): Promise<SecuritySetting> {
  if (USE_MOCK) {
    return MOCK_SECURITY_SETTING;
  }
  try {
    return await apiFetch<SecuritySetting>("/~api/v1/settings/security");
  } catch {
    return MOCK_SECURITY_SETTING;
  }
}
