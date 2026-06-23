import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface TagProtection {
  id: string;
  pattern: string;
  allowedRoles: string[];
}

export default function TagProtectionsPage() {
  const { projectPath } = useProject();

  const [protections, setProtections] = useState<TagProtection[]>([
    { id: "1", pattern: "v*", allowedRoles: ["Owner"] },
  ]);

  const handleRemove = (id: string) => {
    setProtections((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Tag Protections">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Tag Pattern</th>
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
                    No tag protections configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button type="button" className="btn btn-primary btn-sm">
            <Icon name="plus" className="me-1" />
            Add Protection
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
