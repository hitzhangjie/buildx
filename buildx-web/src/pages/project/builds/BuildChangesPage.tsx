import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface MockFileChange {
  path: string;
  additions: number;
  deletions: number;
  status: "Added" | "Modified" | "Deleted";
}

const MOCK_FILE_CHANGES: MockFileChange[] = [];

export function BuildChangesPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();

  const totalAdditions = MOCK_FILE_CHANGES.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = MOCK_FILE_CHANGES.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}`}
                className="nav-link"
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
                className="nav-link active"
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

          {/* Diff Stats Summary */}
          <div className="d-flex align-items-center mb-4 text-muted font-size-sm">
            <span className="mr-3">
              <Icon name="file-document" /> {MOCK_FILE_CHANGES.length} files changed
            </span>
            <span className="text-success mr-3">+{totalAdditions}</span>
            <span className="text-danger">-{totalDeletions}</span>
          </div>

          {/* File Change List */}
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th className="text-right">Additions</th>
                <th className="text-right">Deletions</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FILE_CHANGES.map((file) => (
                <tr key={file.path}>
                  <td>
                    <div className="d-flex align-items-center">
                      <span className={`badge badge-sm font-size-xs mr-2 ${
                        file.status === "Added"
                          ? "badge-light-success"
                          : file.status === "Deleted"
                          ? "badge-light-danger"
                          : "badge-light-info"
                      }`}>
                        {file.status}
                      </span>
                      <code>{file.path}</code>
                    </div>
                  </td>
                  <td className="text-right text-success">+{file.additions}</td>
                  <td className="text-right text-danger">-{file.deletions}</td>
                </tr>
              ))}
              {MOCK_FILE_CHANGES.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">
                    No file changes
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
