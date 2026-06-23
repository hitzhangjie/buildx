import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface StateTransition {
  id: string;
  fromState: string;
  toState: string;
  condition: string;
}

export default function ProjectStateTransitionListPage() {
  const { projectPath } = useProject();

  const [transitions, setTransitions] = useState<StateTransition[]>([
    { id: "1", fromState: "Open", toState: "In Progress", condition: "Assignee set" },
    { id: "2", fromState: "In Progress", toState: "Resolved", condition: "All tasks completed" },
    { id: "3", fromState: "Resolved", toState: "Closed", condition: "Verified" },
  ]);

  const handleRemove = (id: string) => {
    setTransitions((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="State Transitions">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>From State</th>
                <th>To State</th>
                <th>Condition</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {transitions.map((t) => (
                <tr key={t.id}>
                  <td>
                    <span className="badge bg-info">{t.fromState}</span>
                  </td>
                  <td>
                    <Icon name="arrow-right" className="mx-1" />
                    <span className="badge bg-primary">{t.toState}</span>
                  </td>
                  <td className="text-muted">{t.condition}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-link me-2">
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => handleRemove(t.id)}
                    >
                      <Icon name="remove" />
                    </button>
                  </td>
                </tr>
              ))}
              {transitions.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-muted text-center">
                    No state transitions configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </SettingsLayout>
  );
}
