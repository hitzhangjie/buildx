import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

interface BoardCard {
  number: number;
  title: string;
}

const BOARD_COLUMNS: {
  id: string;
  label: string;
  stateColor: "light-warning" | "light-primary" | "light-success";
  cards: BoardCard[];
}[] = [
  {
    id: "open",
    label: "Open",
    stateColor: "light-warning",
    cards: [
      { number: 1, title: "Setup CI pipeline" },
      { number: 3, title: "Add dark mode support" },
    ],
  },
  {
    id: "in-progress",
    label: "In Progress",
    stateColor: "light-primary",
    cards: [{ number: 2, title: "Fix login redirect" }],
  },
  {
    id: "done",
    label: "Done",
    stateColor: "light-success",
    cards: [{ number: 4, title: "Refactor API client" }],
  },
];

/**
 * Mirrors OneDev IssueBoardsPage (kanban board).
 * Reference: references/onedev/.../web/page/project/issues/boards/IssueBoardsPage.html
 */
export function IssueBoardsPage() {
  const { projectPath } = useProject();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Issue Boards">
      <div
        className="d-flex flex-grow-1 overflow-auto p-3"
        style={{ gap: "1rem" }}
      >
        {BOARD_COLUMNS.map((column) => (
          <div
            key={column.id}
            className="card flex-shrink-0"
            style={{ width: "320px" }}
          >
            <div
              className={`card-header d-flex align-items-center justify-content-between bg-${column.stateColor}`}
            >
              <h5 className="card-title mb-0">{column.label}</h5>
              <span className="badge badge-light">
                {column.cards.length}
              </span>
            </div>
            <div className="card-body">
              {column.cards.map((card) => (
                <div key={card.number} className="card mb-2">
                  <div className="card-body py-2 px-3">
                    <span className="font-weight-bold text-muted font-size-sm">
                      #{card.number}
                    </span>
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
