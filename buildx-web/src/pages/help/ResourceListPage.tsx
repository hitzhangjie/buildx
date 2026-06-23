import { Link } from "react-router-dom";
import { Layout } from "../../layout/Layout";

type ApiResource = {
  name: string;
  description: string;
};

const RESOURCES: ApiResource[] = [
  { name: "projects", description: "Manage projects: create, update, delete, and query projects" },
  { name: "users", description: "Manage users: create, update, delete, and query users" },
  { name: "groups", description: "Manage groups: create, update, delete, and query groups" },
  { name: "roles", description: "Manage roles: create, update, delete, and query roles" },
  { name: "issues", description: "Manage issues: create, update, delete, and query issues" },
  { name: "pull-requests", description: "Manage pull requests: create, update, merge, and query" },
  { name: "builds", description: "Manage builds: query, cancel, and rerun builds" },
  { name: "agents", description: "Manage build agents: query and manage agent status" },
];

/**
 * Mirrors OneDev ResourceListPage.html.
 * Reference: references/onedev/.../web/page/help/ResourceListPage.html
 */
export function ResourceListPage() {
  return (
    <Layout title="RESTful API">
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header">
            <h5 className="mb-0">RESTful API Resources</h5>
          </div>
          <div className="card-body">
            <p className="text-muted">
              BuildX provides a RESTful API for integrating with external tools and automation.
              Click on a resource to view its available endpoints.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {RESOURCES.map((resource) => (
                  <tr key={resource.name}>
                    <td>
                      <Link to={`/~help/api/${resource.name}`}>
                        <code>{resource.name}</code>
                      </Link>
                    </td>
                    <td>{resource.description}</td>
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
