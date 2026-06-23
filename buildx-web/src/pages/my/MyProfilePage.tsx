import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev MyProfilePage.html.
 * Reference: references/onedev/.../web/page/my/MyProfilePage.html
 */
export function MyProfilePage() {
  const user = {
    name: "admin",
    fullName: "Administrator",
    email: "admin@example.com",
    roles: ["Administrator"],
  };

  return (
    <Layout title="My Profile">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">My Profile</h5>
          </div>
          <div className="card-body">
            <div className="list-group list-group-flush">
              <div className="list-group-item d-flex justify-content-between align-items-center">
                <span className="font-weight-bold">Name</span>
                <span>{user.name}</span>
              </div>
              <div className="list-group-item d-flex justify-content-between align-items-center">
                <span className="font-weight-bold">Full Name</span>
                <span>{user.fullName}</span>
              </div>
              <div className="list-group-item d-flex justify-content-between align-items-center">
                <span className="font-weight-bold">Email</span>
                <span>{user.email}</span>
              </div>
              <div className="list-group-item d-flex justify-content-between align-items-center">
                <span className="font-weight-bold">Roles</span>
                <span>
                  {user.roles.map((role) => (
                    <span key={role} className="badge badge-secondary mr-1">
                      {role}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </div>
          <div className="card-footer">
            <a href="/~my/basic-setting" className="btn btn-primary">
              <Icon name="pencil" className="icon mr-1" width={16} height={16} />
              Edit
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
