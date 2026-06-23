import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type BrandingSetting = {
  name: string;
};

const MOCK_BRANDING: BrandingSetting = {
  name: "BuildX",
};

export async function fetchBrandingSetting(): Promise<BrandingSetting> {
  if (USE_MOCK) {
    return MOCK_BRANDING;
  }
  try {
    return await apiFetch<BrandingSetting>("/~api/v1/settings/branding");
  } catch {
    return MOCK_BRANDING;
  }
}
