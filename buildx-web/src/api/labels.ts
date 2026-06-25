import { apiFetch } from "./client";

export interface LabelSpec {
  id: number;
  name: string;
  color: string;
}

export async function fetchLabelSpecs(): Promise<LabelSpec[]> {
  return apiFetch<LabelSpec[]>("/~api/label-specs");
}
