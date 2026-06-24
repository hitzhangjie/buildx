import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type User = {
  id: number;
  name: string;
  fullName: string;
  email?: string;
  disabled?: boolean;
};

const MOCK_USERS: User[] = [
  { id: 1, name: "admin", fullName: "Administrator", email: "admin@example.com" },
  { id: 2, name: "dev1", fullName: "Developer One", email: "dev1@example.com" },
  { id: 3, name: "dev2", fullName: "Developer Two", email: "dev2@example.com" },
];

export async function fetchUsers(query?: string): Promise<User[]> {
  if (USE_MOCK) {
    const keyword = query?.trim().toLowerCase();
    if (!keyword) {
      return MOCK_USERS;
    }
    return MOCK_USERS.filter((user) =>
      [user.name, user.fullName, user.email ?? ""].some((field) =>
        field.toLowerCase().includes(keyword),
      ),
    );
  }

  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set("query", query.trim());
  }
  const url = params.size > 0 ? `/~api/users?${params.toString()}` : "/~api/users";
  const data = await apiFetch<User[] | null>(url);
  return Array.isArray(data) ? data : [];
}

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

export async function createUser(req: SignUpRequest): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch("/~api/users", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

export async function signUp(req: SignUpRequest): Promise<void> {
  await createUser(req);
}
