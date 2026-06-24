import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type User = {
  id: number;
  name: string;
  fullName: string;
};

export async function fetchCurrentUser(): Promise<User | null> {
  if (USE_MOCK) {
    return null;
  }
  try {
    return await apiFetch<User>("/~api/users/me");
  } catch {
    return null;
  }
}

export async function login(
  username: string,
  password: string,
  rememberMe: boolean,
): Promise<User> {
  if (USE_MOCK) {
    localStorage.setItem("buildx-mock-login", username);
    return { id: 1, name: username, fullName: username };
  }
  const user = await apiFetch<User>("/~api/v1/login", {
    method: "POST",
    body: JSON.stringify({ userName: username, password, rememberMe }),
  });
  return user;
}

export async function logout(): Promise<void> {
  if (USE_MOCK) {
    localStorage.removeItem("buildx-mock-login");
    return;
  }
  await apiFetch("/~api/v1/logout", { method: "POST" });
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
