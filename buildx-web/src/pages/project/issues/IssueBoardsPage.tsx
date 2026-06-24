import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  backlogQueryFromBoard,
  boardColumnsFromSettings,
  type BoardColumn,
} from "../../../api/issueBoards";
import { defaultBoard, fetchIssueSetting } from "../../../api/issueSettings";
import { fetchProjectIterations, type Iteration } from "../../../api/iterations";
import {
  buildProjectIssueQuery,
  fetchProjectIssues,
  stateBadgeColor,
  transitionIssueState,
  type Issue,
} from "../../../api/issues";
import { useProject } from "../../../context/ProjectContext";
import { useAsyncResource } from "../../../hooks/useAsyncResource";
import { ProjectLayout } from "../../../layout/ProjectLayout";

type IterationFilter = "all" | "unscheduled" | number;

const BACKLOG_COLUMN: BoardColumn = {
  state: "__backlog__",
  label: "Backlog",
  stateColor: "light",
};

/**
 * Mirrors OneDev IssueBoardsPage (kanban board).
 * Reference: references/onedev/.../web/page/project/issues/boards/IssueBoardsPage.html
 */
export function IssueBoardsPage() {
  const { projectPath } = useProject();
  const [refreshKey, setRefreshKey] = useState(0);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iterationFilter, setIterationFilter] = useState<IterationFilter>("all");
  const [boardIndex, setBoardIndex] = useState(0);
  const [showBacklog, setShowBacklog] = useState(true);
  const [boardQuery, setBoardQuery] = useState("");

  const { data: issueSetting } = useAsyncResource(() => fetchIssueSetting(), []);

  const { data: iterations } = useAsyncResource(
    () => fetchProjectIterations(projectPath),
    [projectPath],
  );

  const selectedBoard = useMemo(() => {
    if (!issueSetting) {
      return null;
    }
    return issueSetting.boardSpecs[boardIndex] ?? defaultBoard(issueSetting);
  }, [issueSetting, boardIndex]);

  const boardUserQuery = useMemo(() => {
    if (!selectedBoard) {
      return boardQuery.trim() || undefined;
    }
    const parts: string[] = [];
    if (selectedBoard.baseQuery?.trim()) {
      parts.push(selectedBoard.baseQuery.trim());
    }
    if (boardQuery.trim()) {
      parts.push(boardQuery.trim());
    }
    return parts.length > 0 ? parts.join(" and ") : undefined;
  }, [selectedBoard, boardQuery]);

  const issueOpts = useMemo(() => {
    if (iterationFilter === "all") {
      return {};
    }
    if (iterationFilter === "unscheduled") {
      return { unscheduledOnly: true };
    }
    return { iterationId: iterationFilter };
  }, [iterationFilter]);

  const { data: issues, loading } = useAsyncResource(
    () => fetchProjectIssues(projectPath, boardUserQuery, issueOpts),
    [projectPath, refreshKey, issueOpts, boardUserQuery],
  );

  const backlogQuery = useMemo(() => {
    if (!selectedBoard || !showBacklog) {
      return null;
    }
    return backlogQueryFromBoard(selectedBoard);
  }, [selectedBoard, showBacklog]);

  const { data: backlogIssues } = useAsyncResource(
    async () => {
      if (!backlogQuery) {
        return [];
      }
      return fetchProjectIssues(projectPath, backlogQuery, { unscheduledOnly: true });
    },
    [projectPath, refreshKey, backlogQuery],
  );

  const stateColumns = useMemo(() => {
    if (!issueSetting) {
      return [];
    }
    return boardColumnsFromSettings(issueSetting, boardIndex);
  }, [issueSetting, boardIndex]);

  const columns = useMemo(() => {
    const grouped = new Map<string, Issue[]>();
    for (const col of stateColumns) {
      grouped.set(col.state, []);
    }
    for (const issue of issues ?? []) {
      const list = grouped.get(issue.state);
      if (list) {
        list.push(issue);
      } else {
        grouped.set(issue.state, [issue]);
      }
    }
    const result = stateColumns.map((col) => ({
      ...col,
      cards: grouped.get(col.state) ?? [],
    }));
    if (showBacklog && backlogQuery) {
      return [
        { ...BACKLOG_COLUMN, cards: backlogIssues ?? [] },
        ...result,
      ];
    }
    return result;
  }, [stateColumns, issues, showBacklog, backlogQuery, backlogIssues]);

  const allIssues = useMemo(() => {
    const map = new Map<number, Issue>();
    for (const issue of issues ?? []) {
      map.set(issue.id, issue);
    }
    for (const issue of backlogIssues ?? []) {
      map.set(issue.id, issue);
    }
    return [...map.values()];
  }, [issues, backlogIssues]);

  async function handleDrop(targetState: string, issue: Issue) {
    if (targetState === "__backlog__" || issue.state === targetState) {
      return;
    }
    setError(null);
    try {
      await transitionIssueState(issue.id, targetState);
      setRefreshKey((n) => n + 1);
    } catch (err) {
      setError((err as { message?: string }).message ?? "Failed to move issue");
    }
  }

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Issue Boards">
      <div className="d-flex flex-wrap align-items-center px-3 pt-3" style={{ gap: "0.75rem" }}>
        {issueSetting && issueSetting.boardSpecs.length > 1 && (
          <div className="d-flex align-items-center">
            <label className="text-muted font-size-sm mb-0 mr-2" htmlFor="board-selector">
              Board
            </label>
            <select
              id="board-selector"
              className="form-control form-control-sm"
              style={{ width: "180px" }}
              value={boardIndex}
              onChange={(e) => setBoardIndex(parseInt(e.target.value, 10))}
            >
              {issueSetting.boardSpecs.map((board, idx) => (
                <option key={board.name} value={idx}>
                  {board.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="d-flex align-items-center">
          <label className="text-muted font-size-sm mb-0 mr-2" htmlFor="board-iteration-filter">
            Iteration
          </label>
          <select
            id="board-iteration-filter"
            className="form-control form-control-sm"
            style={{ width: "240px" }}
            value={String(iterationFilter)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all" || v === "unscheduled") {
                setIterationFilter(v);
              } else {
                setIterationFilter(parseInt(v, 10));
              }
            }}
          >
            <option value="all">All issues</option>
            <option value="unscheduled">Unscheduled</option>
            {(iterations ?? []).map((iter: Iteration) => (
              <option key={iter.id} value={iter.id}>
                {iter.name}
              </option>
            ))}
          </select>
        </div>
        <div className="d-flex align-items-center flex-grow-1" style={{ minWidth: "200px" }}>
          <input
            type="search"
            className="form-control form-control-sm"
            placeholder="Filter board..."
            value={boardQuery}
            onChange={(e) => setBoardQuery(e.target.value)}
            aria-label="Board query filter"
          />
        </div>
        <label className="mb-0 d-flex align-items-center font-size-sm">
          <input
            type="checkbox"
            className="mr-2"
            checked={showBacklog}
            onChange={(e) => setShowBacklog(e.target.checked)}
          />
          Show backlog
        </label>
        {boardUserQuery && (
          <span className="text-muted font-size-sm" title={buildProjectIssueQuery(projectPath, boardUserQuery)}>
            Query active
          </span>
        )}
      </div>
      {error && (
        <div className="alert alert-danger mx-3 mt-3 mb-0" role="alert">
          {error}
        </div>
      )}
      {loading && <div className="text-muted p-3">Loading board...</div>}
      <div
        className="d-flex flex-grow-1 overflow-auto p-3"
        style={{ gap: "1rem" }}
      >
        {columns.map((column) => (
          <div
            key={column.state}
            className="card flex-shrink-0"
            style={{ width: "320px" }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (column.state === "__backlog__") {
                setDraggingId(null);
                return;
              }
              const id = Number(e.dataTransfer.getData("text/issue-id"));
              const issue = allIssues.find((i) => i.id === id);
              if (issue) {
                void handleDrop(column.state, issue);
              }
              setDraggingId(null);
            }}
          >
            <div
              className={`card-header d-flex align-items-center justify-content-between${
                column.headerColor ? "" : ` bg-${column.stateColor}`
              }`}
              style={column.headerColor ? { backgroundColor: column.headerColor, color: "#fff" } : undefined}
            >
              <h5 className="card-title mb-0">{column.label}</h5>
              <span className="badge badge-light">{column.cards.length}</span>
            </div>
            <div className="card-body">
              {column.cards.map((card) => (
                <div
                  key={card.id}
                  className={`card mb-2${draggingId === card.id ? " opacity-50" : ""}`}
                  draggable={column.state !== "__backlog__"}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/issue-id", String(card.id));
                    setDraggingId(card.id);
                  }}
                  onDragEnd={() => setDraggingId(null)}
                >
                  <div className="card-body py-2 px-3">
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <Link
                        to={`/${projectPath}/~issues/${card.number}`}
                        className="font-weight-bold text-body"
                        onClick={(e) => e.stopPropagation()}
                      >
                        #{card.number}
                      </Link>
                      <span className={`badge badge-${stateBadgeColor(card.state)} font-size-sm`}>
                        {card.state}
                      </span>
                    </div>
                    <div>{card.title}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ProjectLayout>
  );
}
