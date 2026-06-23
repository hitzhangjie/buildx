import { useState } from "react";
import { useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Authorization = {
  id: number;
  projectName: string;
  role: string;
};

/**
 * Mirrors OneDev GroupAuthorizationsPage.html.
 * Reference: references/onedev/.../web/page/admin/group/GroupAuthorizationsPage.html
 */
export function GroupAuthorizationsPage() {
  const { groupName } = useParams<{ groupName: string }>();

  const [authorizations, setAuthorizations] = useState<Authorization[]>([
    { id: 1, projectName: "buildx-server", role: "Developer" },
    { id: 2, projectName: "buildx-web", role: "Developer" },
    { id: 3, projectName: "buildx-cli", role: "Viewer" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleRemove(id: number) {
    try {
      // TODO: wire to API
      setAuthorizations((prev) => prev.filter((a) => a.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to remove authorization"]);
    }
  }

  return (
    <Layout title={groupName || "Group Authorizations"}>
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Authorizations - {groupName}</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <table className="table">
              <thead>
                <tr>
                  <th>Authorized Project</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {authorizations.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No authorizations
                    </td>
                  </tr>
                )}
                {authorizations.map((auth) => (
                  <tr key={auth.id}>
                    <td>{auth.projectName}</td>
                    <td>{auth.role}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(auth.id)}
                      >
                        <Icon name="trash" className="icon mr-1" width={14} height={14} />
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
