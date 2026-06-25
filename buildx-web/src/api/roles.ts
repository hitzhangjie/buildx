import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export interface Role {
  id: number;
  name: string;
}

const MOCK_ROLES: Role[] = [
  { id: 1, name: "Project Owner" },
  { id: 2, name: "Developer" },
  { id: 3, name: "Viewer" },
  { id: 4, name: "Code Writer" },
  { id: 5, name: "Code Reader" },
];

export async function fetchRoles(): Promise<Role[]> {
  if (USE_MOCK) {
    return [...MOCK_ROLES];
  }
  return apiFetch<Role[]>("/~api/roles");
}
