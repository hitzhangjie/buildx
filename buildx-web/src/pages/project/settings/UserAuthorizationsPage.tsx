import { useState } from "react";
import { useProject } from "../../../context/ProjectContext";
import { SettingsLayout } from "../../../components/onedev/SettingsLayout";
import { Icon } from "../../../components/onedev/Icon";

interface UserAuthorization {
  id: string;
  userName: string;
  role: string;
}

export default function UserAuthorizationsPage() {
  const { projectPath } = useProject();

  const [authorizations, setAuthorizations] = useState<UserAuthorization[]>([
    { id: "1", userName: "alice", role: "Developer" },
    { id: "2", userName: "bob", role: "Viewer" },
  ]);

  const handleRemove = (id: string) => {
    setAuthorizations((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <SettingsLayout projectPath={projectPath} pageTitle="User Authorizations">
      <div className="card">
        <div className="card-body">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {authorizations.map((auth) => (
                <tr key={auth.id}>
                  <td>{auth.userName}</td>
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
                    No user authorizations configured.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <button type="button" className="btn btn-primary btn-sm">
            <Icon name="plus" className="me-1" />
            Add Authorization
          </button>
        </div>
      </div>
    </SettingsLayout>
  );
}
