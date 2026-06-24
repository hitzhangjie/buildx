import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";

export function BuildLogPage() {
  const { projectPath, build, loading, error } = useBuildDetail();

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="log"
    >
      <div
        className="build-log flex-grow-1"
        style={{
          backgroundColor: "var(--dark-mode-bg, #1e1e1e)",
          color: "var(--dark-mode-text, #d4d4d4)",
          fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
          fontSize: "13px",
          lineHeight: "1.5",
          padding: "16px",
          borderRadius: "4px",
          overflowX: "auto",
          minHeight: "400px",
        }}
      >
        <div className="text-muted">No log entries yet</div>
      </div>
    </BuildDetailLayout>
  );
}
