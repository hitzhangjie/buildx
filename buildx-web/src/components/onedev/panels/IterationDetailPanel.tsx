import { Link } from "react-router-dom";
import { Icon } from "../Icon";
import {
  formatIterationDay,
  iterationStatus,
  type Iteration,
} from "../../../api/iterations";

export type IterationTabId = "issues" | "burndown" | "edit";

const TABS: { id: IterationTabId; label: string; href: string }[] = [
  { id: "issues", label: "Issues", href: "" },
  { id: "burndown", label: "Burndown", href: "/burndown" },
  { id: "edit", label: "Edit", href: "/edit" },
];

export function IterationTabNav({
  activeTab,
  projectPath,
  iterationId,
}: {
  activeTab: IterationTabId;
  projectPath: string;
  iterationId: number;
}) {
  const base = `/${projectPath}/~iterations/${iterationId}`;

  return (
    <ul className="nav nav-tabs mb-4">
      {TABS.map((tab) => (
        <li key={tab.id} className="nav-item">
          <Link
            to={base + tab.href}
            className={`nav-link${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const STATUS_LABEL: Record<string, string> = {
  active: "Active",
  upcoming: "Upcoming",
  closed: "Closed",
};

export function IterationHeader({ iteration }: { iteration: Iteration }) {
  const status = iterationStatus(iteration);
  const badgeClass =
    status === "closed"
      ? "badge-light-secondary"
      : status === "upcoming"
        ? "badge-light-warning"
        : "badge-light-primary";

  return (
    <>
      <div className="d-flex align-items-center mb-3">
        <h4 className="mb-0 mr-3">{iteration.name}</h4>
        <span className={`badge ${badgeClass} font-size-sm`}>
          {STATUS_LABEL[status]}
        </span>
      </div>
      <div className="text-muted font-size-sm mb-4 d-flex align-items-center flex-wrap">
        <Icon name="calendar" />
        <span className="ml-1 mr-3">
          {formatIterationDay(iteration.startDay)} &rarr;{" "}
          {formatIterationDay(iteration.dueDay)}
        </span>
      </div>
    </>
  );
}
