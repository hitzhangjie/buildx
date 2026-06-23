import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface ChangedFile {
  path: string;
  additions: number;
  deletions: number;
}

const MOCK_FILES: ChangedFile[] = [
  { path: "src/main.go", additions: 42, deletions: 12 },
  { path: "src/config.go", additions: 15, deletions: 3 },
  { path: "Makefile", additions: 8, deletions: 0 },
  { path: "README.md", additions: 20, deletions: 5 },
];

export function CommitDetailPage() {
  const { projectPath } = useProject();
  const { commit } = useParams<{ commit: string }>();
  const [tab, setTab] = useState<"files" | "diff">("files");

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Commit">
      <div className="m-3">
        <div className="card card-custom mb-3">
          <div className="card-body">
            <div className="d-flex align-items-center mb-3">
              <Link to={`/${projectPath}/~commits`} className="text-muted mr-3">
                <Icon name="arrow-left" /> Commits
              </Link>
            </div>
            <h5 className="font-weight-bold">Initial commit</h5>
            <div className="text-muted font-size-sm">
              <span className="badge badge-light-secondary mr-2">{commit ?? "abc1234"}</span>
              <Icon name="user" /> admin
              <span className="mx-2">|</span>
              2026-06-20 10:00:00
            </div>
          </div>
        </div>

        <ul className="nav nav-tabs nav-tabs-line nav-tabs-line-2x mb-0">
          <li className="nav-item">
            <a
              href="#"
              className={`nav-link${tab === "files" ? " active" : ""}`}
              onClick={(e) => { e.preventDefault(); setTab("files"); }}
            >
              Files Changed
            </a>
          </li>
          <li className="nav-item">
            <a
              href="#"
              className={`nav-link${tab === "diff" ? " active" : ""}`}
              onClick={(e) => { e.preventDefault(); setTab("diff"); }}
            >
              Diff
            </a>
          </li>
        </ul>

        <div className="card card-custom">
          <div className="card-body p-0">
            <table className="table mb-0">
              <thead>
                <tr>
                  <th>File</th>
                  <th className="text-right">Changes</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_FILES.map((file) => (
                  <tr key={file.path}>
                    <td>
                      <code className="text-primary">{file.path}</code>
                    </td>
                    <td className="text-right text-nowrap">
                      <span className="text-success mr-2">+{file.additions}</span>
                      <span className="text-danger">-{file.deletions}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
