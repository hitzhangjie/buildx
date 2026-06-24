import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { PullRequestDetailShell } from "../../../components/onedev/panels/PullRequestDetailShell";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import { usePullRequestDetail } from "../../../hooks/usePullRequestDetail";
import { fetchCompare, type CompareResult } from "../../../api/compare";
import { fetchProjects } from "../../../api/projects";

function diffStatus(additions: number, deletions: number): string {
  if (additions > 0 && deletions === 0) return "Added";
  if (deletions > 0 && additions === 0) return "Deleted";
  return "Modified";
}

export function PullRequestChangesPage() {
  const { projectPath } = useProject();
  const { request } = useParams<{ request: string }>();
  const { pr, reviews, mergePreview, loading, error } = usePullRequestDetail(projectPath);
  const [compare, setCompare] = useState<CompareResult | null>(null);

  useEffect(() => {
    if (!pr) {
      setCompare(null);
      return;
    }
    let cancelled = false;
    void fetchProjects()
      .then((projects) => projects.find((p) => p.path === projectPath)?.id)
      .then((projectId) => {
        if (!projectId || cancelled) return null;
        return fetchCompare(projectId, {
          left: pr.targetBranch,
          right: pr.sourceBranch,
          includeDiffs: true,
        });
      })
      .then((result) => {
        if (!cancelled && result) {
          setCompare(result);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pr, projectPath]);

  const diffs = compare?.diffs ?? [];
  const totalAdditions = diffs.reduce((sum, f) => sum + (f.additions ?? 0), 0);
  const totalDeletions = diffs.reduce((sum, f) => sum + (f.deletions ?? 0), 0);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${request}`}>
      <PullRequestDetailShell
        projectPath={projectPath}
        requestNumber={request ?? ""}
        pr={pr}
        reviews={reviews}
        activeTab="changes"
        mergePreview={mergePreview}
        loading={loading}
        error={error}
      >
        <div className="d-flex align-items-center mb-4 text-muted font-size-sm">
          <span className="mr-3">
            <Icon name="file-document" /> {diffs.length} files changed
          </span>
          <span className="text-success mr-3">+{totalAdditions}</span>
          <span className="text-danger">-{totalDeletions}</span>
        </div>

        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th className="text-right">Additions</th>
              <th className="text-right">Deletions</th>
            </tr>
          </thead>
          <tbody>
            {diffs.map((file) => {
              const status = diffStatus(file.additions ?? 0, file.deletions ?? 0);
              return (
                <tr key={file.path}>
                  <td>
                    <div className="d-flex align-items-center">
                      <span
                        className={`badge badge-sm font-size-xs mr-2 ${
                          status === "Added"
                            ? "badge-light-success"
                            : status === "Deleted"
                              ? "badge-light-danger"
                              : "badge-light-info"
                        }`}
                      >
                        {status}
                      </span>
                      <code>{file.path}</code>
                    </div>
                  </td>
                  <td className="text-right text-success">+{file.additions ?? 0}</td>
                  <td className="text-right text-danger">-{file.deletions ?? 0}</td>
                </tr>
              );
            })}
            {!diffs.length && !loading && (
              <tr>
                <td colSpan={3} className="text-center text-muted py-5">
                  No file changes
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </PullRequestDetailShell>
    </ProjectLayout>
  );
}
