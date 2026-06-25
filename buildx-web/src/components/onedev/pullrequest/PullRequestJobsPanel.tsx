import { Link } from "react-router-dom";
import type { Build } from "../../../api/builds";
import { BuildStatusIcon, buildStatusLabel } from "../build/BuildStatusIcon";

/**
 * PullRequestJobsPanel — displays required/associated build jobs for a PR.
 *
 * Shows each job's status icon, name, and a link to the build detail page.
 * Used in the PR detail summary area to show CI status at a glance.
 *
 * Reference: references/onedev/.../web/component/pullrequest/build/PullRequestJobsPanel.html
 */
export type JobBuildInfo = {
  jobName: string;
  build?: Build | null;
  required?: boolean;
};

export type PullRequestJobsPanelProps = {
  jobs: JobBuildInfo[];
  projectPath: string;
};

export function PullRequestJobsPanel({
  jobs,
  projectPath,
}: PullRequestJobsPanelProps) {
  if (jobs.length === 0) {
    return null;
  }

  const requiredJobs = jobs.filter((j) => j.required);
  const optionalJobs = jobs.filter((j) => !j.required);

  return (
    <div className="pull-request-jobs d-flex flex-column row-gap-3">
      {/* Required jobs section */}
      {requiredJobs.length > 0 && (
        <div className="required-jobs">
          <div className="font-weight-bolder mb-2">
            Required Jobs
          </div>
          <div className="d-flex flex-wrap align-items-start row-gap-2 column-gap-3">
            {requiredJobs.map((job) => (
              <JobStatusBadge
                key={job.jobName}
                job={job}
                projectPath={projectPath}
              />
            ))}
          </div>
        </div>
      )}

      {/* Optional jobs section */}
      {optionalJobs.length > 0 && (
        <div className="optional-jobs">
          <div className="font-weight-bolder mb-2 text-muted">
            Optional Jobs
          </div>
          <div className="d-flex flex-wrap align-items-start row-gap-2 column-gap-3">
            {optionalJobs.map((job) => (
              <JobStatusBadge
                key={job.jobName}
                job={job}
                projectPath={projectPath}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function JobStatusBadge({
  job,
  projectPath,
}: {
  job: JobBuildInfo;
  projectPath: string;
}) {
  const status = job.build?.status;
  const buildNumber = job.build?.number;

  return (
    <div className="d-flex align-items-center job text-nowrap">
      {status ? (
        <>
          {buildNumber ? (
            <Link
              to={`/${projectPath}/~builds/${buildNumber}`}
              className="d-flex align-items-center"
              title={`${job.jobName} — ${buildStatusLabel(status)}`}
            >
              <BuildStatusIcon status={status} className="status mr-1 flex-shrink-0" />
              <span className="name mr-1 text-truncate">{job.jobName}</span>
            </Link>
          ) : (
            <>
              <BuildStatusIcon status={status} className="status mr-1 flex-shrink-0" />
              <span className="name mr-1 text-truncate">{job.jobName}</span>
            </>
          )}
        </>
      ) : (
        <>
          <span
            className="status mr-1 flex-shrink-0"
            style={{
              width: 16,
              height: 16,
              borderRadius: "50%",
              border: "2px solid var(--muted)",
              display: "inline-block",
            }}
          />
          <span className="name mr-1 text-muted text-truncate">
            {job.jobName}
          </span>
        </>
      )}
    </div>
  );
}
