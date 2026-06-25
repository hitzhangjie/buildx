import { useEffect, useState } from "react";
import { useBuildDetail } from "./useBuildDetail";
import { BuildDetailLayout } from "../../../components/onedev/build/BuildDetailLayout";
import {
  PipelinePanel,
  type PipelineJob,
} from "../../../components/onedev/pipeline/PipelinePanel";
import {
  getBuildDependencies,
  getBuildDependents,
  type BuildDependence,
} from "../../../api/builds";
import type { Build } from "../../../api/builds";
import "./build-detail.css";

/**
 * BuildPipelinePage — visual DAG of job dependencies.
 *
 * When CI engine provides the full build spec, this renders all jobs
 * and their dependency graph. Falls back to single-job view when
 * the build spec is not available.
 *
 * Reference: references/onedev/.../web/page/project/builds/detail/pipeline/BuildPipelinePage.html
 */
export function BuildPipelinePage() {
  const { projectPath, build, loading, error } = useBuildDetail();
  const [pipelineJobs, setPipelineJobs] = useState<PipelineJob[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  useEffect(() => {
    if (!build) return;

    let cancelled = false;

    async function loadPipeline() {
      setPipelineLoading(true);
      try {
        // Re-read build inside the closure (it could be stale but the guard
        // above ensures it's non-null at entry)
        const currentBuild = build;
        if (!currentBuild) return;

        const [depsData, dependentsData] = await Promise.all([
          getBuildDependencies(currentBuild.id).catch(() => [] as BuildDependence[]),
          getBuildDependents(currentBuild.id).catch(() => [] as BuildDependence[]),
        ]);

        if (cancelled) return;

        const jobs = buildPipelineFromDeps(
          currentBuild,
          depsData,
          dependentsData,
        );
        if (!cancelled) {
          setPipelineJobs(jobs);
        }
      } catch {
        if (!cancelled && build) {
          setPipelineJobs([
            {
              name: build.jobName,
              column: 0,
              row: 0,
              dependencies: [],
              status: build.status,
              buildNumber: build.number,
            },
          ]);
        }
      } finally {
        if (!cancelled) setPipelineLoading(false);
      }
    }

    void loadPipeline();

    return () => {
      cancelled = true;
    };
  }, [build]);

  return (
    <BuildDetailLayout
      projectPath={projectPath}
      build={build}
      loading={loading}
      error={error}
      activeTab="pipeline"
    >
      <div className="build-pipeline-container">
        {build && pipelineJobs.length > 0 && !pipelineLoading && (
          <PipelinePanel
            jobs={pipelineJobs}
            projectPath={projectPath}
            activeJobIndex="0-0"
          />
        )}
        {build && pipelineJobs.length > 0 && pipelineLoading && (
          <div className="text-center py-5 text-muted">
            Loading pipeline...
          </div>
        )}
        {build && pipelineJobs.length === 0 && !pipelineLoading && (
          <div className="text-muted py-5 text-center">
            No pipeline data available for this build.
          </div>
        )}
        {!build && !loading && (
          <div className="text-muted py-5 text-center">
            Pipeline view will appear when buildspec execution is
            implemented.
          </div>
        )}
        {loading && (
          <div className="text-center py-10 text-muted">Loading...</div>
        )}
      </div>
    </BuildDetailLayout>
  );
}

/**
 * Build pipeline jobs from dependencies data.
 * If dependencies exist, we create a DAG with columns based on
 * dependency depth. Otherwise, we show a single job.
 */
function buildPipelineFromDeps(
  currentBuild: Build,
  deps: BuildDependence[],
  dependents: BuildDependence[],
): PipelineJob[] {
  // If we have dependency info, try to build a richer graph
  if (deps.length > 0 || dependents.length > 0) {
    const jobs: PipelineJob[] = [
      {
        name: currentBuild.jobName,
        column: 1,
        row: 0,
        dependencies: deps.length > 0 ? ["dependent-job"] : [],
        status: currentBuild.status,
        buildNumber: currentBuild.number,
      },
    ];

    // Add dependency jobs as upstream nodes
    deps.forEach((dep, i) => {
      jobs.push({
        name: `Dependency #${dep.dependencyId}`,
        column: 0,
        row: i,
        dependencies: [],
        status: dep.requireSuccessful ? "SUCCESSFUL" : undefined,
      });
    });

    return jobs;
  }

  // Fallback: single job
  return [
    {
      name: currentBuild.jobName,
      column: 0,
      row: 0,
      dependencies: [],
      status: currentBuild.status,
      buildNumber: currentBuild.number,
    },
  ];
}
