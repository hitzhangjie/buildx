const AUTH_STORAGE_KEY = "buildx-auth";

export type StoredAuth = {
  username: string;
  password: string;
};

export function loadStoredAuth(): StoredAuth | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed.username && parsed.password) {
      return parsed;
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function saveStoredAuth(auth: StoredAuth): void {
  sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));
}

export function clearStoredAuth(): void {
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function authHeader(): HeadersInit {
  const auth = loadStoredAuth();
  if (!auth) {
    return {};
  }
  const token = btoa(`${auth.username}:${auth.password}`);
  return { Authorization: `Basic ${token}` };
}

export type ApiError = {
  status: number;
  message: string;
};

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const auth = authHeader();
  for (const [key, value] of Object.entries(auth)) {
    if (!headers.has(key)) {
      headers.set(key, value);
    }
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, { ...init, headers });
  if (!response.ok) {
    let message = response.statusText;
    try {
      const body = (await response.json()) as { error?: string; message?: string };
      message = body.error ?? body.message ?? message;
    } catch {
      /* ignore */
    }
    const err: ApiError = { status: response.status, message };
    throw err;
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}
