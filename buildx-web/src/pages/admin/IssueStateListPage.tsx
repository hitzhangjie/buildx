import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type IssueState = {
  id: number;
  name: string;
  color: string;
  description: string;
};

const MOCK_STATES: IssueState[] = [
  { id: 1, name: "Open", color: "#28a745", description: "Issue is open and being worked on" },
  { id: 2, name: "In Progress", color: "#007bff", description: "Work on this issue has started" },
  { id: 3, name: "Resolved", color: "#ffc107", description: "Issue has been resolved" },
  { id: 4, name: "Closed", color: "#6c757d", description: "Issue is closed" },
  { id: 5, name: "Reopened", color: "#dc3545", description: "Issue was previously closed and reopened" },
];

/**
 * Mirrors OneDev IssueStateListPage.html.
 * Reference: references/onedev/.../web/page/admin/issuestate/IssueStateListPage.html
 */
export function IssueStateListPage() {
  const states = MOCK_STATES;

  return (
    <Layout title="Issue States">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Issue States</h5>
            <Link to="/~administration/settings/issue-states/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New State
            </Link>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Color</th>
                  <th>Description</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {states.map((state) => (
                  <tr key={state.id}>
                    <td>{state.name}</td>
                    <td>
                      <span className="badge" style={{ backgroundColor: state.color, color: "#fff" }}>
                        {state.color}
                      </span>
                    </td>
                    <td>{state.description}</td>
                    <td>
                      <Link
                        to={`/~administration/settings/issue-states/${state.id}`}
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
