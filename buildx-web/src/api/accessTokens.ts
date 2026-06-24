import { apiFetch } from "./client";

export type AccessToken = {
  id: number;
  name: string;
  ownerId: number;
  /** Only present in the create response — never returned on list/get. */
  value?: string;
  hasOwnerPermissions: boolean;
  createDate: string;
  expireDate?: string | null;
};

export async function fetchAccessTokens(): Promise<AccessToken[]> {
  return apiFetch<AccessToken[]>("/~api/access-tokens");
}

export async function createAccessToken(name: string): Promise<AccessToken> {
  return apiFetch<AccessToken>("/~api/access-tokens", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export async function deleteAccessToken(id: number): Promise<void> {
  await apiFetch<void>(`/~api/access-tokens/${id}`, { method: "DELETE" });
}
