import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";

export function BuildPipelinePage() {
  const { projectPath, build, loading, error } = useBuildDetail();

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="pipeline"
    >
      <div className="text-muted py-5 text-center">
        Pipeline view will appear when buildspec execution is implemented.
      </div>
    </BuildDetailLayout>
  );
}
