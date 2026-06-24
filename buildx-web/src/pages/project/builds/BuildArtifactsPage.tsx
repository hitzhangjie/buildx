import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";

export function BuildArtifactsPage() {
  const { projectPath, build, loading, error } = useBuildDetail();

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="artifacts"
    >
      <div className="text-muted py-5 text-center">No artifacts available</div>
    </BuildDetailLayout>
  );
}
