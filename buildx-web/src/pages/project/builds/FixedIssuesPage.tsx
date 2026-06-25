import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import { Icon } from "../../../components/onedev/Icon";
import { apiFetch } from "../../../api/client";
import type { Build } from "../../../api/builds";
import "./build-detail.css";

export function FixedIssuesPage() {
  const { projectPath, build, loading, error } = useBuildDetail();

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="fixed-issues"
    >
      <div className="fixed-issues">
        {build && <FixedIssuesContent build={build} projectPath={projectPath} />}
        {!build && !loading && (
          <div className="text-muted py-5 text-center">No fixed issues</div>
        )}
        {loading && (
          <div className="text-center py-10 text-muted">Loading…</div>
        )}
      </div>
    </BuildDetailLayout>
  );
}

function FixedIssuesContent({
  build,
  projectPath,
}: {
  build: Build;
  projectPath: string;
}) {
  const [issueIds, setIssueIds] = useState<number[] | null>(null);
  const [loadingIssues, setLoadingIssues] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoadingIssues(true);
    apiFetch<number[] | null>(`/~api/builds/${build.id}/fixed-issue-ids`)
      .then((ids) => {
        if (!cancelled) {
          setIssueIds(Array.isArray(ids) ? ids : []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setIssueIds([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingIssues(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [build.id]);

  if (loadingIssues) {
    return <div className="text-center py-5 text-muted">Loading…</div>;
  }

  if (!issueIds || issueIds.length === 0) {
    return (
      <div className="text-muted py-5 text-center">
        <div>
          <Icon name="bug" />
          <span className="ml-2">
            No issues have been marked as fixed by this build.
          </span>
        </div>
        <p className="font-size-sm mt-3 mb-0">
          Fixed issues are detected by scanning commit messages for references
          like "fix #123" in commits between this build and the previous
          successful build on the same ref.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="font-weight-bolder mb-3">
        {issueIds.length} issue{issueIds.length !== 1 ? "s" : ""} fixed
      </div>
      <div className="list-group">
        {issueIds.map((id) => (
          <Link
            key={id}
            to={`/${projectPath}/~issues/${id}`}
            className="list-group-item list-group-item-action d-flex align-items-center"
          >
            <Icon name="bug" />
            <span className="ml-2">Issue #{id}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
