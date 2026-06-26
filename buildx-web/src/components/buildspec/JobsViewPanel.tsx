import type { Job } from "../../buildspec/types";
import { BuildSpecPipelinePanel } from "./BuildSpecPipelinePanel";
import { JobViewer } from "./BeanViewer";

type JobsViewPanelProps = {
  jobs: Job[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
};

export function JobsViewPanel({ jobs, activeIndex, onActiveIndexChange }: JobsViewPanelProps) {
  const activeJob = activeIndex >= 0 ? jobs[activeIndex] : null;

  return (
    <div className="content elements d-flex flex-nowrap jobs">
      <div className="side autofit pr-2">
        <BuildSpecPipelinePanel
          jobs={jobs}
          activeIndex={activeIndex}
          onActiveIndexChange={onActiveIndexChange}
          onJobsChange={() => {}}
          readOnly
        />
      </div>
      <div className="main d-flex flex-column flex-grow-1 ml-4 p-2">
        {activeJob && activeIndex >= 0 ? (
          <div className="body flex-grow-1 autofit p-3">
            <JobViewer job={activeJob} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
