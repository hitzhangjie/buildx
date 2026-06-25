import type { WorkspaceStatus } from "../../api/workspaces";

interface WorkspaceStatusIconProps {
  status: WorkspaceStatus;
  className?: string;
}

/**
 * Renders a colored dot icon indicating workspace status.
 * Mirrors OneDev's WorkspaceStatusIcon component.
 * PENDING = yellow, ACTIVE = green, INACTIVE = gray.
 */
export function WorkspaceStatusIcon({ status, className }: WorkspaceStatusIconProps) {
  let color: string;
  switch (status) {
    case "ACTIVE":
      color = "var(--success)";
      break;
    case "PENDING":
      color = "var(--warning)";
      break;
    case "INACTIVE":
    default:
      color = "var(--muted)";
      break;
  }

  return (
    <svg
      className={className}
      width="10"
      height="10"
      viewBox="0 0 10 10"
      style={{ flexShrink: 0 }}
      aria-label={`workspace status: ${status}`}
    >
      <circle cx="5" cy="5" r="5" fill={color} />
    </svg>
  );
}
