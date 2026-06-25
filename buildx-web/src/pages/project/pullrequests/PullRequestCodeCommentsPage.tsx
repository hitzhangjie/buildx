import { useEffect, useState } from "react";
import { Icon } from "../../../components/onedev/Icon";
import { PullRequestDetailShell } from "../../../components/onedev/panels/PullRequestDetailShell";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";
import { useAuth } from "../../../context/AuthContext";
import { usePullRequestDetail } from "../../../hooks/usePullRequestDetail";
import { fetchProjectCodeComments, type CodeComment } from "../../../api/codeComments";
import { formatWhenISO } from "../../../util/time";

export function PullRequestCodeCommentsPage() {
  const { projectPath, params } = useProject();
  const { user: currentUser } = useAuth();
  const request = params.request as string | undefined;
  const { pr, reviews, assignments, mergePreview, loading, error } = usePullRequestDetail(projectPath);
  const [comments, setComments] = useState<CodeComment[]>([]);

  useEffect(() => {
    if (!pr) {
      setComments([]);
      return;
    }
    let cancelled = false;
    void fetchProjectCodeComments(projectPath).then((all) => {
      if (cancelled) return;
      const baseHash = pr.baseCommitHash ?? "";
      const headHash = pr.buildCommitHash ?? "";
      setComments(all.filter((c) => {
        const hash = c.mark.commitHash;
        return hash === headHash || hash === baseHash;
      }));
    });
    return () => {
      cancelled = true;
    };
  }, [pr, projectPath]);

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Pull Request #${request}`}>
      <PullRequestDetailShell
        projectPath={projectPath}
        requestNumber={request ?? ""}
        pr={pr}
        reviews={reviews}
        assignments={assignments}
        activeTab="code-comments"
        mergePreview={mergePreview}
        loading={loading}
        error={error}
        currentUser={currentUser}
      >
        <table className="table">
          <thead>
            <tr>
              <th>File</th>
              <th>Comment</th>
              <th>Author</th>
            </tr>
          </thead>
          <tbody>
            {comments.map((comment) => (
              <tr key={comment.id}>
                <td className="text-nowrap">
                  <div>
                    <Icon name="file-code" />
                    <code className="ml-1">{comment.mark.path}</code>
                    {comment.mark.range && (
                      <span className="text-muted ml-1">:{comment.mark.range.fromRow + 1}</span>
                    )}
                  </div>
                </td>
                <td className="text-muted">{comment.content}</td>
                <td className="text-nowrap">
                  <div className="d-flex align-items-center">
                    <Icon name="user" />
                    <span className="ml-1">{comment.user?.name ?? "Unknown"}</span>
                    <span className="text-muted font-size-xs ml-2">{formatWhenISO(comment.createDate)}</span>
                  </div>
                </td>
              </tr>
            ))}
            {!comments.length && !loading && (
              <tr>
                <td colSpan={3} className="text-center text-muted py-5">
                  No code comments
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </PullRequestDetailShell>
    </ProjectLayout>
  );
}
