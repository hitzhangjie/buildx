import { apiFetch } from "./client";

/** Declares a stub API endpoint (501/404 returns null for UI-first migration). */
export async function stubGet<T>(path: string): Promise<T | null> {
  try {
    return await apiFetch<T>(path);
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status === 404 || status === 501) {
      return null;
    }
    throw err;
  }
}

export async function stubPost(path: string, body: unknown): Promise<void> {
  await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
}
