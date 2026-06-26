import type { Job } from "../../buildspec/types";
import { BuildSpecPipelinePanel } from "./BuildSpecPipelinePanel";
import { JobViewer } from "./BeanViewer";
import { RunJobLink, type RunJobContext } from "../onedev/job/RunJobLink";

type JobsViewPanelProps = {
  jobs: Job[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  runJobContext?: RunJobContext | null;
};

export function JobsViewPanel({
  jobs,
  activeIndex,
  onActiveIndexChange,
  runJobContext,
}: JobsViewPanelProps) {
  const activeJob = activeIndex >= 0 ? jobs[activeIndex] : null;

  return (
    <div className="content elements d-flex flex-nowrap jobs">
      <BuildSpecPipelinePanel
        className="side autofit pr-2"
        jobs={jobs}
        activeIndex={activeIndex}
        onActiveIndexChange={onActiveIndexChange}
        onJobsChange={() => {}}
        readOnly
        renderJobExtra={
          runJobContext
            ? (job) =>
                job.name ? (
                  <RunJobLink {...runJobContext} jobName={job.name} job={job} />
                ) : null
            : undefined
        }
      />
      {activeJob && activeIndex >= 0 ? (
        <div className="main d-flex flex-column flex-grow-1 ml-4 p-2">
          <div className="body flex-grow-1 autofit p-3">
            <JobViewer job={activeJob} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
