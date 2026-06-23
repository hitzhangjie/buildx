import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface MockChild {
  name: string;
  path: string;
  description: string;
}

const MOCK_CHILDREN: MockChild[] = [
  { name: "Frontend", path: "demo/frontend", description: "Frontend application" },
  { name: "Backend", path: "demo/backend", description: "Backend services" },
];

export function ProjectChildrenPage() {
  const { projectPath } = useProject();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Child Projects">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <div className="flex-grow-1" />
            <button className="btn btn-primary btn-icon flex-shrink-0" title="Create child project" disabled>
              <Icon name="plus" />
            </button>
          </div>
          {MOCK_CHILDREN.length > 0 ? (
            <table className="table">
              <thead>
                <tr>
                  <th>Project</th>
                  <th>Path</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_CHILDREN.map((child) => (
                  <tr key={child.path}>
                    <td>
                      <Link to={`/${child.path}`} className="font-weight-bold">
                        <Icon name="project" /> {child.name}
                      </Link>
                    </td>
                    <td className="text-muted">{child.path}</td>
                    <td className="text-muted">{child.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-5 text-muted">No child projects</div>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
