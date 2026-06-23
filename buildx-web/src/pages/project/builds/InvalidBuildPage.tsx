import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev InvalidBuildPage.
 * Reference: references/onedev/.../web/page/project/builds/detail/InvalidBuildPage.html
 */
export function InvalidBuildPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          <div className="alert alert-warning d-flex align-items-center">
            <Icon name="alert" />
            <div className="ml-3">
              <strong>This build is invalid or has been deleted</strong>
              <div className="mt-1 font-size-sm">
                Build #{number} could not be found or is no longer available.
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Link
              to={`/${projectPath}/~builds`}
              className="btn btn-primary font-weight-bold"
            >
              <Icon name="arrow-left" /> Back to Builds
            </Link>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
