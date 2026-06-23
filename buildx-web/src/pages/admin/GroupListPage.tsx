import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Group = {
  id: number;
  name: string;
  description: string;
  memberCount: number;
};

const MOCK_GROUPS: Group[] = [
  { id: 1, name: "Developers", description: "All developers", memberCount: 5 },
  { id: 2, name: "QA", description: "Quality assurance team", memberCount: 3 },
  { id: 3, name: "Managers", description: "Management team", memberCount: 2 },
];

/**
 * Mirrors OneDev GroupListPage.html.
 * Reference: references/onedev/.../web/page/admin/group/GroupListPage.html
 */
export function GroupListPage() {
  const groups = MOCK_GROUPS;

  return (
    <Layout title="Groups">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Groups</h5>
            <Link to="/~administration/groups/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New Group
            </Link>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((group) => (
                  <tr key={group.id}>
                    <td>{group.name}</td>
                    <td>{group.description}</td>
                    <td>
                      <span className="badge badge-info">{group.memberCount}</span>
                    </td>
                    <td>
                      <Link
                        to={`/~administration/groups/${group.id}`}
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
