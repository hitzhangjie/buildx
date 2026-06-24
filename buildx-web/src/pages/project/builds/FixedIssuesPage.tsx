import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";

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
      <div className="text-muted py-5 text-center">No fixed issues</div>
    </BuildDetailLayout>
  );
}
