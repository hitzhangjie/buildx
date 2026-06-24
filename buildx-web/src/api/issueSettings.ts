import { apiFetch } from "./client";
import { USE_MOCK } from "../mocks/config";

export type StateSpec = {
  name: string;
  color?: string;
};

export type BoardSpec = {
  name: string;
  baseQuery?: string;
  backlogBaseQuery?: string;
  identifyField: string;
  columns: string[];
};

export type NamedIssueQuery = {
  name: string;
  query: string;
};

export type GlobalIssueSetting = {
  stateSpecs: StateSpec[];
  boardSpecs: BoardSpec[];
  namedQueries?: NamedIssueQuery[];
};

const MOCK_ISSUE_SETTING: GlobalIssueSetting = {
  stateSpecs: [
    { name: "Open", color: "#2095F2" },
    { name: "In Progress", color: "#FFA700" },
    { name: "In Review", color: "#9C26B0" },
    { name: "Closed", color: "#1BC5BD" },
  ],
  boardSpecs: [
    {
      name: "State",
      identifyField: "State",
      backlogBaseQuery: '"State" is "Open"',
      columns: ["Open", "In Progress", "In Review", "Closed"],
    },
  ],
  namedQueries: [
    { name: "Open", query: '"State" is "Open"' },
    { name: "In Progress", query: '"State" is "In Progress"' },
    { name: "In Review", query: '"State" is "In Review"' },
    { name: "Closed", query: '"State" is "Closed"' },
  ],
};

export async function fetchIssueSetting(): Promise<GlobalIssueSetting> {
  if (USE_MOCK) {
    return MOCK_ISSUE_SETTING;
  }
  return apiFetch<GlobalIssueSetting>("/~api/settings/issue");
}

export async function saveIssueSetting(setting: GlobalIssueSetting): Promise<void> {
  if (USE_MOCK) {
    return;
  }
  await apiFetch<void>("/~api/settings/issue", {
    method: "POST",
    body: JSON.stringify(setting),
  });
}

export function stateColorMap(setting: GlobalIssueSetting): Map<string, string> {
  const map = new Map<string, string>();
  for (const spec of setting.stateSpecs) {
    if (spec.color) {
      map.set(spec.name, spec.color);
    }
  }
  return map;
}

export function defaultBoard(setting: GlobalIssueSetting): BoardSpec {
  return setting.boardSpecs[0] ?? MOCK_ISSUE_SETTING.boardSpecs[0];
}
