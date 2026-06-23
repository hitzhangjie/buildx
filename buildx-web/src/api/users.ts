import { apiFetch, clearStoredAuth, loadStoredAuth, saveStoredAuth } from "./client";
import { USE_MOCK } from "../mocks/config";

export type User = {
  id: number;
  name: string;
  fullName: string;
};

export async function fetchCurrentUser(): Promise<User | null> {
  if (USE_MOCK) {
    const auth = loadStoredAuth();
    if (!auth) {
      return null;
    }
    return { id: 1, name: auth.username, fullName: auth.username };
  }
  if (!loadStoredAuth()) {
    return null;
  }
  try {
    return await apiFetch<User>("/~api/users/me");
  } catch {
    clearStoredAuth();
    return null;
  }
}

export async function login(username: string, password: string): Promise<User> {
  saveStoredAuth({ username, password });
  if (USE_MOCK) {
    return { id: 1, name: username, fullName: username };
  }
  const user = await apiFetch<User>("/~api/users/me");
  return user;
}

export function logout(): void {
  clearStoredAuth();
}

export type SignUpRequest = {
  name: string;
  fullName: string;
  email: string;
  password: string;
};

export async function signUp(req: SignUpRequest): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch("/~api/users", {
    method: "POST",
    body: JSON.stringify(req),
  });
}
