import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { getBuild, getBuildByNumber, type Build } from "../../../api/builds";
import { useProject } from "../../../context/ProjectContext";

const RUNNING_STATUSES = new Set(["WAITING", "PENDING", "RUNNING"]);

type BuildLocationState = {
  build?: Build;
};

export function useBuildDetail() {
  const { projectPath, params } = useProject();
  const buildNumberParam = params.build;
  const location = useLocation();
  const buildNumber = Number(buildNumberParam);
  const initialBuild = (location.state as BuildLocationState | null)?.build ?? null;
  const [build, setBuild] = useState<Build | null>(initialBuild);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBuild = useCallback(async () => {
    if (!projectPath || !buildNumberParam || Number.isNaN(buildNumber)) {
      return null;
    }

    const byNumber = await getBuildByNumber(projectPath, buildNumber);
    if (byNumber) {
      return byNumber;
    }

    if (initialBuild?.id && initialBuild.number === buildNumber) {
      return getBuild(initialBuild.id);
    }

    return null;
  }, [projectPath, buildNumber, buildNumberParam, initialBuild]);

  useEffect(() => {
    if (!projectPath || !buildNumberParam || Number.isNaN(buildNumber)) {
      setLoading(false);
      setError("Invalid build number");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void loadBuild()
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
  }, [projectPath, buildNumber, buildNumberParam, loadBuild]);

  // Poll while the build is still running so status/durations stay current.
  useEffect(() => {
    if (!build || !RUNNING_STATUSES.has(build.status)) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadBuild()
        .then((item) => {
          if (item) {
            setBuild(item);
          }
        })
        .catch(() => {
          // Keep showing the last known build state while polling.
        });
    }, 3000);

    return () => {
      window.clearInterval(interval);
    };
  }, [build?.id, build?.status, loadBuild]);

  const refreshBuild = useCallback(async () => {
    const item = await loadBuild();
    if (item) {
      setBuild(item);
    }
    return item;
  }, [loadBuild]);

  return { projectPath, build, loading, error, buildNumber, refreshBuild, setBuild };
}
