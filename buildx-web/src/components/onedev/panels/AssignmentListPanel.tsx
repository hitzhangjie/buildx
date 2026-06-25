import type { PullRequestAssignment } from "../../../api/pullRequests";

interface AssignmentListPanelProps {
  assignments: PullRequestAssignment[];
  editable?: boolean;
}

export function AssignmentListPanel({ assignments, editable }: AssignmentListPanelProps) {
  if (assignments.length === 0) {
    return (
      <div className="text-muted font-size-sm font-italic">
        {editable ? "No assignees yet" : "None"}
      </div>
    );
  }

  return (
    <div className="assignment-list">
      {assignments.map((a) => (
        <div key={a.id} className="assignment-item d-flex align-items-center mb-1">
          <span className="avatar avatar-sm mr-2">
            {a.user?.name?.charAt(0).toUpperCase() ?? "?"}
          </span>
          <span className="font-size-sm">{a.user?.fullName || a.user?.name || "Unknown"}</span>
        </div>
      ))}
    </div>
  );
}
