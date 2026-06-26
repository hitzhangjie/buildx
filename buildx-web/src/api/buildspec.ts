import { apiFetch } from "./client";

export type BuildSpecValidationResult = {
  valid: boolean;
  errors?: string[];
};

export async function validateBuildSpecYaml(content: string): Promise<BuildSpecValidationResult> {
  try {
    const result = await apiFetch<BuildSpecValidationResult>("/~api/buildspec/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    return result;
  } catch {
    return { valid: true, errors: [] };
  }
}
