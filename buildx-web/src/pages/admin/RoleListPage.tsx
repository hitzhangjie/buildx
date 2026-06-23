import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Role = {
  id: number;
  name: string;
  description: string;
};

const MOCK_ROLES: Role[] = [
  { id: 1, name: "Administrator", description: "Full system access" },
  { id: 2, name: "Developer", description: "Can view and edit code, issues, and builds" },
  { id: 3, name: "Viewer", description: "Read-only access" },
];

/**
 * Mirrors OneDev RoleListPage.html.
 * Reference: references/onedev/.../web/page/admin/role/RoleListPage.html
 */
export function RoleListPage() {
  const roles = MOCK_ROLES;

  return (
    <Layout title="Roles">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Roles</h5>
            <Link to="/~administration/roles/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New Role
            </Link>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {roles.map((role) => (
                  <tr key={role.id}>
                    <td>{role.name}</td>
                    <td>{role.description}</td>
                    <td>
                      <Link
                        to={`/~administration/roles/${role.id}`}
                        className="btn btn-link btn-sm"
                      >
                        <Icon name="pencil" className="icon mr-1" width={14} height={14} />
                        Edit
                      </Link>
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
