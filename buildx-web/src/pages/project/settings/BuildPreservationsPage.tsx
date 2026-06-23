import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface BuildPreservation {
  id: string;
  condition: string;
  count: string;
}

export default function BuildPreservationsPage() {
  const { projectPath } = useProject();

  const [preservations, setPreservations] = useState<BuildPreservation[]>([
    { id: "1", condition: "Successful builds", count: "10" },
    { id: "2", condition: "Failed builds", count: "5" },
  ]);

  const handleRemove = (id: string) => {
    setPreservations((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Build Preservations">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Condition</th>
                <th>Builds to Keep</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {preservations.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.condition}</td>
                  <td>{rule.count}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-link me-2">
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => handleRemove(rule.id)}
                    >
                      <Icon name="remove" />
                    </button>
                  </td>
                </tr>
              ))}
              {preservations.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted text-center">
                    No build preservation rules configured.
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
