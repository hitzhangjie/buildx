import { useState } from "react";
import { useParams } from "react-router-dom";
import { FormFeedbackPanel } from "../../components/onedev/FormFeedbackPanel";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Membership = {
  id: number;
  userName: string;
  role: string;
};

/**
 * Mirrors OneDev GroupMembershipsPage.html.
 * Reference: references/onedev/.../web/page/admin/group/GroupMembershipsPage.html
 */
export function GroupMembershipsPage() {
  const { groupName } = useParams<{ groupName: string }>();

  const [memberships, setMemberships] = useState<Membership[]>([
    { id: 1, userName: "admin", role: "Administrator" },
    { id: 2, userName: "dev1", role: "Developer" },
    { id: 3, userName: "dev2", role: "Developer" },
  ]);
  const [errors, setErrors] = useState<string[]>([]);

  function handleRemove(id: number) {
    try {
      // TODO: wire to API
      setMemberships((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setErrors([(err as { message?: string }).message ?? "Failed to remove membership"]);
    }
  }

  return (
    <Layout title={groupName || "Group Memberships"}>
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">Memberships - {groupName}</h5>
          </div>
          <div className="card-body">
            <FormFeedbackPanel messages={errors} />

            <table className="table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Role</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {memberships.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center text-muted">
                      No memberships
                    </td>
                  </tr>
                )}
                {memberships.map((m) => (
                  <tr key={m.id}>
                    <td>{m.userName}</td>
                    <td>{m.role}</td>
                    <td>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemove(m.id)}
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
