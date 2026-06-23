import { useParams, Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { Layout } from "../../layout/Layout";

type Endpoint = {
  method: string;
  path: string;
  description: string;
};

const RESOURCE_ENDPOINTS: Record<string, Endpoint[]> = {
  projects: [
    { method: "GET", path: "/~api/projects", description: "List all projects" },
    { method: "POST", path: "/~api/projects", description: "Create a new project" },
    { method: "GET", path: "/~api/projects/{id}", description: "Get a project by ID" },
    { method: "DELETE", path: "/~api/projects/{id}", description: "Delete a project" },
  ],
  users: [
    { method: "GET", path: "/~api/users", description: "List all users" },
    { method: "POST", path: "/~api/users", description: "Create a new user" },
    { method: "GET", path: "/~api/users/{id}", description: "Get a user by ID" },
    { method: "DELETE", path: "/~api/users/{id}", description: "Delete a user" },
  ],
  issues: [
    { method: "GET", path: "/~api/issues", description: "List issues" },
    { method: "POST", path: "/~api/issues", description: "Create an issue" },
    { method: "GET", path: "/~api/issues/{id}", description: "Get an issue by ID" },
  ],
};

const DEFAULT_ENDPOINTS: Endpoint[] = [
  { method: "GET", path: "/~api/{resource}", description: "List resource items" },
  { method: "POST", path: "/~api/{resource}", description: "Create a resource item" },
  { method: "GET", path: "/~api/{resource}/{id}", description: "Get a resource item by ID" },
];

/**
 * Mirrors OneDev ResourceDetailPage.html.
 * Reference: references/onedev/.../web/page/help/ResourceDetailPage.html
 */
export function ResourceDetailPage() {
  const { resource } = useParams<{ resource: string }>();
  const endpoints = resource
    ? RESOURCE_ENDPOINTS[resource.toLowerCase()] ?? DEFAULT_ENDPOINTS
    : DEFAULT_ENDPOINTS;
  const resourceName = resource ?? "unknown";

  return (
    <Layout title={`API: ${resourceName}`}>
      <div className="container m-2 m-sm-5">
        <div className="card">
          <div className="card-header d-flex align-items-center">
            <Link to="/~help/api" className="btn btn-link btn-sm mr-3">
              <Icon name="arrow-left" className="icon mr-1" width={16} height={16} />
              Back
            </Link>
            <h5 className="mb-0">
              <code>{resourceName}</code> API
            </h5>
          </div>
          <div className="card-body">
            <p className="text-muted">
              Available endpoints for the <code>{resourceName}</code> resource.
            </p>
            <table className="table">
              <thead>
                <tr>
                  <th>Method</th>
                  <th>Path</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map((ep, idx) => (
                  <tr key={idx}>
                    <td>
                      <span
                        className={`badge ${
                          ep.method === "GET"
                            ? "badge-success"
                            : ep.method === "POST"
                              ? "badge-primary"
                              : ep.method === "DELETE"
                                ? "badge-danger"
                                : "badge-info"
                        }`}
                      >
                        {ep.method}
                      </span>
                    </td>
                    <td><code>{ep.path}</code></td>
                    <td>{ep.description}</td>
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
