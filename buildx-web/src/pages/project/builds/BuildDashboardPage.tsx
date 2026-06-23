import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

const STATUS_BADGE_CLASS: Record<string, string> = {
  SUCCESSFUL: "badge-light-success",
  FAILED: "badge-light-danger",
  RUNNING: "badge-light-info",
  CANCELLED: "badge-light-secondary",
  PENDING: "badge-light-warning",
};

export function BuildDashboardPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();

  // Mock build detail
  const build = {
    number: Number(number),
    jobName: "CI Pipeline",
    status: "SUCCESSFUL" as const,
    branch: "main",
    commit: "a1b2c3d",
    submitter: "admin",
    date: "2026-06-23 09:15",
    duration: "3m 42s",
    commitMessage: "Add CI pipeline configuration",
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Build Info Header */}
          <div className="mb-4">
            <div className="d-flex align-items-center flex-wrap mb-2">
              <h4 className="mb-0 mr-3">
                {build.jobName} #{build.number}
              </h4>
              <span className={`badge font-size-sm mr-2 ${STATUS_BADGE_CLASS[build.status]}`}>
                {build.status}
              </span>
            </div>
            <div className="text-muted font-size-sm d-flex align-items-center flex-wrap">
              <Icon name="branch" />
              <span className="ml-1 mr-2">{build.branch}</span>
              <span className="mx-1">|</span>
              <Icon name="commit" />
              <Link
                to={`/${projectPath}/~commits/${build.commit}`}
                className="ml-1 mr-2 text-muted"
              >
                {build.commit}
              </Link>
              <span className="mx-1">|</span>
              <Icon name="user" />
              <span className="ml-1">{build.submitter}</span>
              <span className="mx-1">|</span>
              <Icon name="calendar" />
              <span className="ml-1">{build.date}</span>
            </div>
          </div>

          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}`}
                className="nav-link active"
              >
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/pipeline`}
                className="nav-link"
              >
                Pipeline
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/log`}
                className="nav-link"
              >
                Log
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/changes`}
                className="nav-link"
              >
                Changes
              </Link>
            </li>
            <li className="nav-item">
              <span className="nav-link disabled">Fixed Issues</span>
            </li>
            <li className="nav-item">
              <span className="nav-link disabled">Artifacts</span>
            </li>
          </ul>

          {/* Dashboard Content */}
          <div className="row">
            <div className="col-md-6">
              <div className="card card-sm mb-3">
                <div className="card-header">
                  <h5 className="card-title">Summary</h5>
                </div>
                <div className="card-body">
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td className="text-muted">Duration</td>
                        <td>{build.duration}</td>
                      </tr>
                      <tr>
                        <td className="text-muted">Triggered By</td>
                        <td>
                          <Icon name="user" /> {build.submitter}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Branch</td>
                        <td>
                          <Icon name="branch" /> {build.branch}
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Commit</td>
                        <td>
                          <code>{build.commit}</code>
                        </td>
                      </tr>
                      <tr>
                        <td className="text-muted">Date</td>
                        <td>{build.date}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card card-sm mb-3">
                <div className="card-header">
                  <h5 className="card-title">Commit Message</h5>
                </div>
                <div className="card-body">
                  <p className="mb-0">{build.commitMessage}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
