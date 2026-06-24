import type { BuildStatus } from "../../../api/builds";

const STATUS_ICON: Record<BuildStatus, string> = {
  SUCCESSFUL: "tick-circle-o",
  FAILED: "times-circle-o",
  CANCELLED: "cancel",
  PENDING: "target",
  RUNNING: "spin",
  TIMED_OUT: "timeout",
  WAITING: "clock",
};

const STATUS_CLASS: Record<BuildStatus, string> = {
  SUCCESSFUL: "build-status-successful",
  FAILED: "build-status-failed",
  CANCELLED: "build-status-cancelled",
  PENDING: "build-status-pending",
  RUNNING: "build-status-running spin",
  TIMED_OUT: "build-status-timed_out",
  WAITING: "build-status-waiting",
};

type BuildStatusIconProps = {
  status: BuildStatus;
  className?: string;
  width?: number;
  height?: number;
};

export function BuildStatusIcon({
  status,
  className = "",
  width = 16,
  height = 16,
}: BuildStatusIconProps) {
  const icon = STATUS_ICON[status] ?? "dot";
  const statusClass = STATUS_CLASS[status] ?? "build-status-none";
  return (
    <img
      src={`/~icon/${icon}.svg`}
      alt=""
      className={`icon flex-shrink-0 ${statusClass} ${className}`.trim()}
      width={width}
      height={height}
    />
  );
}

export function buildStatusLabel(status: BuildStatus): string {
  switch (status) {
    case "SUCCESSFUL":
      return "Successful";
    case "FAILED":
      return "Failed";
    case "CANCELLED":
      return "Cancelled";
    case "PENDING":
      return "Pending";
    case "RUNNING":
      return "Running";
    case "TIMED_OUT":
      return "Timed out";
    case "WAITING":
      return "Waiting";
    default:
      return status;
  }
}
