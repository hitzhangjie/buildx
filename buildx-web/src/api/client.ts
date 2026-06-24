export type ApiError = {
  status: number;
  message: string;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // No manual auth header — session cookie is sent automatically by the browser.
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  if (!response.ok) {
    let message = response.statusText;
    if (text) {
      try {
        const body = JSON.parse(text) as { error?: string; message?: string };
        message = body.error ?? body.message ?? message;
      } catch {
        message = text;
      }
    }
    const err: ApiError = { status: response.status, message };
    throw err;
  }
  if (response.status === 204 || text === "") {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}
