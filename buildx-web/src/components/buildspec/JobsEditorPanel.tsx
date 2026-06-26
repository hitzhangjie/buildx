import type { Job } from "../../buildspec/types";
import { JobEditorPanel } from "./JobEditorPanel";
import type { BuildSpec } from "../../buildspec/types";
import { BuildSpecPipelinePanel } from "./BuildSpecPipelinePanel";
import { STUB_JOB_SUGGESTIONS } from "./registries";

type JobsEditorPanelProps = {
  spec: BuildSpec;
  jobs: Job[];
  activeIndex: number;
  projectPath?: string;
  revision?: string;
  onActiveIndexChange: (index: number) => void;
  onJobsChange: (jobs: Job[]) => void;
  fieldErrors?: Record<string, string>;
};

export function JobsEditorPanel({
  spec,
  jobs,
  activeIndex,
  projectPath,
  revision,
  onActiveIndexChange,
  onJobsChange,
  fieldErrors,
}: JobsEditorPanelProps) {
  const activeJob = activeIndex >= 0 ? jobs[activeIndex] : null;

  return (
    <div className="content elements d-flex flex-nowrap jobs">
      <BuildSpecPipelinePanel
        className="side autofit pr-2"
        jobs={jobs}
        activeIndex={activeIndex}
        onActiveIndexChange={onActiveIndexChange}
        onJobsChange={onJobsChange}
        suggestedJobs={STUB_JOB_SUGGESTIONS as Job[]}
      />
      {activeJob && activeIndex >= 0 ? (
        <div className="main d-flex flex-column flex-grow-1 ml-4 p-2">
          <div className="body autofit flex-grow-1 p-3">
            <JobEditorPanel
              job={activeJob}
              buildSpec={spec}
              projectPath={projectPath}
              revision={revision}
              fieldErrors={fieldErrors}
              onChange={(next) => {
                const copy = [...jobs];
                copy[activeIndex] = next;
                onJobsChange(copy);
              }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
