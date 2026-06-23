import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type IssueField = {
  id: number;
  name: string;
  type: string;
  required: boolean;
};

const MOCK_FIELDS: IssueField[] = [
  { id: 1, name: "Priority", type: "Enum", required: true },
  { id: 2, name: "Severity", type: "Enum", required: true },
  { id: 3, name: "Due Date", type: "Date", required: false },
  { id: 4, name: "Estimated Hours", type: "Float", required: false },
];

/**
 * Mirrors OneDev IssueFieldListPage.html.
 * Reference: references/onedev/.../web/page/admin/issuefield/IssueFieldListPage.html
 */
export function IssueFieldListPage() {
  const fields = MOCK_FIELDS;

  return (
    <Layout title="Issue Fields">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Issue Fields</h5>
            <Link to="/~administration/settings/issue-fields/new" className="btn btn-primary btn-sm">
              <Icon name="plus" className="icon mr-1" width={16} height={16} />
              New Field
            </Link>
          </div>
          <div className="card-body">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Required</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {fields.map((field) => (
                  <tr key={field.id}>
                    <td>{field.name}</td>
                    <td><span className="badge badge-info">{field.type}</span></td>
                    <td>
                      {field.required ? (
                        <Icon name="check" className="icon text-success" width={16} height={16} />
                      ) : (
                        <Icon name="cross" className="icon text-danger" width={16} height={16} />
                      )}
                    </td>
                    <td>
                      <Link
                        to={`/~administration/settings/issue-fields/${field.id}`}
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
