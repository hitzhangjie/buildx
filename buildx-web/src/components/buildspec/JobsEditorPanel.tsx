import type { Job } from "../../buildspec/types";
import { ElementNavRow } from "./ElementNavRow";
import { Icon } from "../onedev/Icon";
import { JobEditorPanel } from "./JobEditorPanel";
import { namedElementLabel } from "../../buildspec/types";

type JobsEditorPanelProps = {
  jobs: Job[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onJobsChange: (jobs: Job[]) => void;
};

export function JobsEditorPanel({
  jobs,
  activeIndex,
  onActiveIndexChange,
  onJobsChange,
}: JobsEditorPanelProps) {
  const addJob = () => {
    const next = [...jobs, { name: "", steps: [] }];
    onJobsChange(next);
    onActiveIndexChange(next.length - 1);
  };

  const copyJob = (index: number) => {
    const clone = structuredClone(jobs[index]);
    const next = [...jobs];
    next.splice(index + 1, 0, clone);
    onJobsChange(next);
    onActiveIndexChange(index + 1);
  };

  const deleteJob = (index: number) => {
    const next = jobs.filter((_, i) => i !== index);
    onJobsChange(next);
    if (next.length === 0) {
      onActiveIndexChange(-1);
    } else if (index === activeIndex) {
      onActiveIndexChange(0);
    } else if (index < activeIndex) {
      onActiveIndexChange(activeIndex - 1);
    }
  };

  const activeJob = activeIndex >= 0 ? jobs[activeIndex] : null;

  return (
    <div className="content elements d-flex flex-nowrap jobs">
      <div className="side autofit pr-2">
        <div className="pipeline d-flex flex-nowrap">
          <div className="pipeline-column flex-grow-1">
            {jobs.map((job, index) => (
              <div key={index} className="pipeline-row">
                <ElementNavRow
                  label={namedElementLabel(job.name)}
                  active={index === activeIndex}
                  onSelect={() => onActiveIndexChange(index)}
                  onCopy={() => copyJob(index)}
                  onDelete={() => deleteJob(index)}
                />
              </div>
            ))}
            <div className="pipeline-row add-job">
              <div className="add-job nav btn-group flex-nowrap">
                <a
                  href="#"
                  className="create btn btn-primary justify-content-start text-nowrap"
                  onClick={(e) => {
                    e.preventDefault();
                    addJob();
                  }}
                >
                  <Icon name="plus" className="icon flex-shrink-0 mr-1" /> Add New
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="main d-flex flex-column flex-grow-1 ml-4 p-2">
        {activeJob && activeIndex >= 0 ? (
          <div className="body autofit flex-grow-1 p-3">
            <JobEditorPanel
              job={activeJob}
              onChange={(next) => {
                const copy = [...jobs];
                copy[activeIndex] = next;
                onJobsChange(copy);
              }}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
