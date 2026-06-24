import type { BoardSpec, GlobalIssueSetting } from "./issueSettings";
import { defaultBoard, stateColorMap } from "./issueSettings";

export type BoardColumn = {
  state: string;
  label: string;
  headerColor?: string;
  stateColor: "light-warning" | "light-primary" | "light-success" | "light";
};

const STATE_BADGE: Record<string, BoardColumn["stateColor"]> = {
  Open: "light-warning",
  "In Progress": "light-primary",
  "In Review": "light-primary",
  Closed: "light-success",
};

/** Build kanban columns from global issue settings. */
export function boardColumnsFromSettings(
  setting: GlobalIssueSetting,
  boardIndex = 0,
): BoardColumn[] {
  const board = setting.boardSpecs[boardIndex] ?? defaultBoard(setting);
  const colors = stateColorMap(setting);
  return board.columns.map((state) => ({
    state,
    label: state,
    headerColor: colors.get(state),
    stateColor: STATE_BADGE[state] ?? "light-primary",
  }));
}

export function backlogQueryFromBoard(board: BoardSpec): string {
  return board.backlogBaseQuery?.trim() || '"State" is "Open"';
}

/** @deprecated Use boardColumnsFromSettings with live settings. */
export const BOARD_COLUMNS = boardColumnsFromSettings({
  stateSpecs: [],
  boardSpecs: [
    {
      name: "State",
      identifyField: "State",
      columns: ["Open", "In Progress", "In Review", "Closed"],
    },
  ],
});
