import { apiFetch } from "./client";

export type ServerInfo = {
  name: string;
  version: string;
};

export function fetchServerInfo(): Promise<ServerInfo> {
  return apiFetch<ServerInfo>("/~api/v1/info");
}
