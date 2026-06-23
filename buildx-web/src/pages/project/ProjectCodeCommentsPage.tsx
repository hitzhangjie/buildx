import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface MockComment {
  id: number;
  file: string;
  line: number;
  author: string;
  date: string;
  status: string;
  preview: string;
}

const MOCK_COMMENTS: MockComment[] = [
  { id: 1, file: "src/main.go", line: 42, author: "admin", date: "2026-06-22", status: "Open", preview: "This should use a constant instead of magic number" },
  { id: 2, file: "src/config.go", line: 15, author: "dev", date: "2026-06-21", status: "Resolved", preview: "Add validation for empty config values" },
  { id: 3, file: "Makefile", line: 8, author: "admin", date: "2026-06-20", status: "Open", preview: "Consider adding a help target" },
];

export function ProjectCodeCommentsPage() {
  const { projectPath } = useProject();
  const [query, setQuery] = useState("");

  const filtered = MOCK_COMMENTS.filter(
    (c) => !query || c.file.toLowerCase().includes(query.toLowerCase()) || c.preview.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Code Comments">
      <div className="card m-3">
        <div className="card-body">
          <div className="d-flex mb-4">
            <form className="clearable-wrapper flex-grow-1" onSubmit={(e) => e.preventDefault()}>
              <div className="input-group">
                <input
                  spellCheck={false}
                  className="form-control"
                  placeholder="Query/order code comments"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                <span className="input-group-append">
                  <button type="submit" className="btn btn-outline-secondary btn-icon" title="Query">
                    <Icon name="magnify" />
                  </button>
                </span>
              </div>
            </form>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th>File</th>
                <th>Comment</th>
                <th>Author</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((comment) => (
                <tr key={comment.id}>
                  <td>
                    <div>
                      <code>{comment.file}</code>
                      <span className="text-muted ml-1">:{comment.line}</span>
                    </div>
                  </td>
                  <td>
                    <Link to={`/${projectPath}/~code-comments/${comment.id}`} className="text-muted">
                      {comment.preview}
                    </Link>
                  </td>
                  <td className="text-muted">
                    <Icon name="user" /> {comment.author}
                    <div className="font-size-xs">{comment.date}</div>
                  </td>
                  <td>
                    <span className={`badge badge-light-${comment.status === "Open" ? "warning" : "success"} font-size-xs`}>
                      {comment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </ProjectLayout>
  );
}
