import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getBuildByNumber, type Build } from "../../../api/builds";
import { useProject } from "../../../context/ProjectContext";

export function useBuildDetail() {
  const { projectPath } = useProject();
  const { build: buildNumberParam } = useParams<{ build: string }>();
  const buildNumber = Number(buildNumberParam);
  const [build, setBuild] = useState<Build | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectPath || !buildNumberParam || Number.isNaN(buildNumber)) {
      setLoading(false);
      setError("Invalid build number");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void getBuildByNumber(projectPath, buildNumber)
      .then((item) => {
        if (cancelled) {
          return;
        }
        if (!item) {
          setBuild(null);
          setError(`Build #${buildNumber} not found`);
          return;
        }
        setBuild(item);
      })
      .catch((err) => {
        if (!cancelled) {
          setBuild(null);
          setError((err as { message?: string }).message ?? "Failed to load build");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [projectPath, buildNumber, buildNumberParam]);

  return { projectPath, build, loading, error, buildNumber };
}
