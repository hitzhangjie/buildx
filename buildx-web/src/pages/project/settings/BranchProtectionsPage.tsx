import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface BranchProtection {
  id: string;
  pattern: string;
  allowedRoles: string[];
}

export default function BranchProtectionsPage() {
  const { projectPath } = useProject();

  const [protections, setProtections] = useState<BranchProtection[]>([
    { id: "1", pattern: "main", allowedRoles: ["Developer", "Owner"] },
    { id: "2", pattern: "release/**", allowedRoles: ["Developer", "Owner"] },
  ]);

  const handleRemove = (id: string) => {
    setProtections((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Branch Protections">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Branch Pattern</th>
                <th>Allowed Roles</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {protections.map((p) => (
                <tr key={p.id}>
                  <td>
                    <code>{p.pattern}</code>
                  </td>
                  <td>{p.allowedRoles.join(", ")}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-link me-2">
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => handleRemove(p.id)}
                    >
                      <Icon name="remove" />
                    </button>
                  </td>
                </tr>
              ))}
              {protections.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted text-center">
                    No branch protections configured.
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
