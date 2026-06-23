import { type FormEvent, useState } from "react";
import { Icon } from "../../components/onedev/Icon";
import { ProjectLayout } from "../../layout/ProjectLayout";
import { useProject } from "../../context/ProjectContext";

interface DiffFile {
  path: string;
  additions: number;
  deletions: number;
}

const MOCK_DIFF: DiffFile[] = [
  { path: "src/main.go", additions: 42, deletions: 12 },
  { path: "src/config.go", additions: 15, deletions: 3 },
  { path: "Makefile", additions: 8, deletions: 0 },
];

export function RevisionComparePage() {
  const { projectPath } = useProject();
  const [base, setBase] = useState("main");
  const [target, setTarget] = useState("feature/auth");
  const [compared, setCompared] = useState(false);

  function handleCompare(e: FormEvent) {
    e.preventDefault();
    setCompared(true);
  }

  const totalAdditions = MOCK_DIFF.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = MOCK_DIFF.reduce((s, f) => s + f.deletions, 0);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Compare Revisions">
      <div className="card m-3">
        <div className="card-body">
          <form onSubmit={handleCompare} className="mb-4">
            <div className="form-row">
              <div className="col-md-5">
                <label className="font-weight-bold font-size-sm">Base Revision</label>
                <input
                  className="form-control"
                  placeholder="e.g. main, v1.0.0, abc1234"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                />
              </div>
              <div className="col-md-1 d-flex align-items-end justify-content-center">
                <span className="text-muted mb-2">←</span>
              </div>
              <div className="col-md-5">
                <label className="font-weight-bold font-size-sm">Target Revision</label>
                <input
                  className="form-control"
                  placeholder="e.g. feature/auth"
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                />
              </div>
              <div className="col-md-1 d-flex align-items-end">
                <button type="submit" className="btn btn-primary btn-icon" title="Compare">
                  <Icon name="compare" />
                </button>
              </div>
            </div>
          </form>

          {compared && (
            <>
              <div className="d-flex mb-4 p-3 bg-light rounded">
                <div className="mr-4">
                  <span className="text-success font-weight-bold mr-2">+{totalAdditions}</span>
                  <span className="text-danger font-weight-bold">-{totalDeletions}</span>
                </div>
                <div className="text-muted">
                  {MOCK_DIFF.length} files changed
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>File</th>
                    <th className="text-right">Changes</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_DIFF.map((file) => (
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
            </>
          )}
        </div>
      </div>
    </ProjectLayout>
  );
}
