import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";

/**
 * Mirrors OneDev InvalidPullRequestPage.
 * Reference: references/onedev/.../web/page/project/pullrequests/detail/InvalidPullRequestPage.html
 */
export function InvalidPullRequestPage() {
  const { projectPath } = useProject();
  const { request } = useParams<{ request: string }>();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${request}`}>
      <div className="card m-3">
        <div className="card-body">
          <div className="alert alert-warning d-flex align-items-center">
            <Icon name="alert" />
            <div className="ml-3">
              <strong>This pull request is invalid or has been deleted</strong>
              <div className="mt-1 font-size-sm">
                Pull Request #{request} could not be found or is no longer available.
              </div>
            </div>
          </div>
          <div className="mt-3">
            <Link
              to={`/${projectPath}/~pulls`}
              className="btn btn-primary font-weight-bold"
            >
              <Icon name="arrow-left" /> Back to Pull Requests
            </Link>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
