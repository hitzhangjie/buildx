import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { fetchIssueSetting } from "../../api/issueSettings";
import { useAsyncResource } from "../../hooks/useAsyncResource";
import { Layout } from "../../layout/Layout";

/**
 * Mirrors OneDev IssueStateListPage.html.
 * Reference: references/onedev/.../web/page/admin/issuestate/IssueStateListPage.html
 */
export function IssueStateListPage() {
  const { data: setting, loading, error } = useAsyncResource(() => fetchIssueSetting(), []);
  const states = setting?.stateSpecs ?? [];

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
            {loading && <div className="text-muted">Loading states...</div>}
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            {!loading && !error && (
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Color</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {states.map((state, index) => (
                    <tr key={state.name}>
                      <td>{state.name}</td>
                      <td>
                        {state.color ? (
                          <span
                            className="badge"
                            style={{ backgroundColor: state.color, color: "#fff" }}
                          >
                            {state.color}
                          </span>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </td>
                      <td>
                        <Link
                          to={`/~administration/settings/issue-states/${index + 1}`}
                          className="btn btn-link btn-sm"
                        >
                          <Icon name="edit" className="icon mr-1" width={14} height={14} />
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
