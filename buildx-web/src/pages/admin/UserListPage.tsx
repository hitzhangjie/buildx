import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type User = {
  id: number;
  name: string;
  fullName: string;
  email: string;
};

const MOCK_USERS: User[] = [
  { id: 1, name: "admin", fullName: "Administrator", email: "admin@example.com" },
  { id: 2, name: "dev1", fullName: "Developer One", email: "dev1@example.com" },
  { id: 3, name: "dev2", fullName: "Developer Two", email: "dev2@example.com" },
];

/**
 * Mirrors OneDev UserListPage.html.
 * Reference: references/onedev/.../web/page/admin/user/UserListPage.html
 */
export function UserListPage() {
  const users = MOCK_USERS;

  return (
    <Layout title="Users">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Users</h5>
            <Link to="/~administration/users/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New User
            </Link>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td>{user.name}</td>
                    <td>{user.fullName}</td>
                    <td>{user.email}</td>
                    <td>
                      <Link
                        to={`/~administration/users/${user.id}`}
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
