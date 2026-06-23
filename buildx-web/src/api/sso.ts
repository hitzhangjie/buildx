import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type SsoProvider = {
  name: string;
  buttonImageUrl: string;
  loginUrl: string;
};

const MOCK_SSO: SsoProvider[] = [];

export async function fetchSsoProviders(): Promise<SsoProvider[]> {
  if (USE_MOCK) {
    return MOCK_SSO;
  }
  try {
    return await apiFetch<SsoProvider[]>("/~api/v1/sso-providers");
  } catch {
    return MOCK_SSO;
  }
}
