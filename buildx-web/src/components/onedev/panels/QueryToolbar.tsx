import type { ReactNode } from "react";
import { Icon } from "../Icon";
import type { ListToolbarAction } from "./ResourcefulListPanel";

type QueryToolbarProps = {
  actions: ListToolbarAction[];
  className?: string;
  trailing?: ReactNode;
};

export function QueryToolbar({ actions, className = "operations mb-5", trailing }: QueryToolbarProps) {
  return (
    <div className={className}>
      {actions.map((action) => (
        <a
          key={action.label}
          href={action.href ?? "#"}
          className={`text-gray d-inline-block mr-4 mb-2 text-nowrap ${action.className ?? ""}`}
          onClick={(e) => {
            if (!action.href) {
              e.preventDefault();
            }
            action.onClick?.();
          }}
        >
          <Icon name={action.icon} /> {action.label}
        </a>
      ))}
      {trailing}
    </div>
  );
}

export function queryToolbarCount(count: ReactNode) {
  return <span className="float-right text-gray">{count}</span>;
}
