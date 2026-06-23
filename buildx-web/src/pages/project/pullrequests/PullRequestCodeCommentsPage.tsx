import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface CodeComment {
  id: number;
  file: string;
  line: number;
  author: string;
  date: string;
  content: string;
}

const codeComments: CodeComment[] = [];

export function PullRequestCodeCommentsPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}`}
                className="nav-link"
              >
                Activities
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}/changes`}
                className="nav-link"
              >
                Changes
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~pulls/${number}/code-comments`}
                className="nav-link active"
              >
                Code Comments
              </Link>
            </li>
          </ul>

          {/* Code Comments List */}
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Comment</th>
                <th>Author</th>
              </tr>
            </thead>
            <tbody>
              {codeComments.map((comment) => (
                <tr key={comment.id}>
                  <td className="text-nowrap">
                    <div>
                      <Icon name="file-code" />
                      <code className="ml-1">{comment.file}</code>
                      <span className="text-muted ml-1">:{comment.line}</span>
                    </div>
                  </td>
                  <td className="text-muted">{comment.content}</td>
                  <td className="text-nowrap">
                    <div className="d-flex align-items-center">
                      <Icon name="user" />
                      <span className="ml-1">{comment.author}</span>
                      <span className="text-muted font-size-xs ml-2">{comment.date}</span>
                    </div>
                  </td>
                </tr>
              ))}
              {codeComments.length === 0 && (
                <tr>
                  <td colSpan={3} className="text-center text-muted py-5">
                    No code comments
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
