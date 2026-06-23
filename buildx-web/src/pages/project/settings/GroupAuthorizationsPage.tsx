import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface GroupAuthorization {
  id: string;
  groupName: string;
  role: string;
}

export default function GroupAuthorizationsPage() {
  const { projectPath } = useProject();

  const [authorizations, setAuthorizations] = useState<GroupAuthorization[]>([
    { id: "1", groupName: "developers", role: "Developer" },
    { id: "2", groupName: "viewers", role: "Viewer" },
  ]);

  const handleRemove = (id: string) => {
    setAuthorizations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="Group Authorizations">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Role</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authorizations.map((auth) => (
                <tr key={auth.id}>
                  <td>{auth.groupName}</td>
                  <td>{auth.role}</td>
                  <td className="text-end">
                    <button className="btn btn-sm btn-link me-2">
                      <Icon name="edit" />
                    </button>
                    <button
                      className="btn btn-sm btn-link text-danger"
                      onClick={() => handleRemove(auth.id)}
                    >
                      <Icon name="remove" />
                    </button>
                  </td>
                </tr>
              ))}
              {authorizations.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-muted text-center">
                    No group authorizations configured.
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
