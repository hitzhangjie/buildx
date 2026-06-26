import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Job } from "../../../buildspec/types";
import { submitBuild } from "../../../api/builds";
import { Icon } from "../Icon";
import { ModalPanel } from "../../buildspec/ModalPanel";

export type RunJobContext = {
  projectId: number;
  projectPath: string;
  commitHash: string;
  refName: string;
};

type RunJobLinkProps = RunJobContext & {
  jobName: string;
  job?: Job;
};

export function RunJobLink({ projectId, projectPath, commitHash, refName, jobName, job }: RunJobLinkProps) {
  const navigate = useNavigate();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paramNoticeOpen, setParamNoticeOpen] = useState(false);

  const hasParamSpecs = (job?.paramSpecs?.length ?? 0) > 0;

  const runJob = async () => {
    setRunning(true);
    setError(null);
    try {
      const build = await submitBuild({
        projectId,
        commitHash,
        jobName,
        refName,
        reason: "Submitted manually",
      });
      navigate(`/${projectPath}/~builds/${build.number}/log`, {
        state: { build },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to run job";
      setError(message);
    } finally {
      setRunning(false);
    }
  };

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (running) {
      return;
    }
    if (hasParamSpecs) {
      setParamNoticeOpen(true);
      return;
    }
    void runJob();
  };

  return (
    <>
      <a
        href="#"
        className="run btn btn-outline-secondary btn-icon flex-grow-0 flex-shrink-0"
        title="Run this job"
        aria-label="Run this job"
        onClick={handleClick}
        style={running ? { pointerEvents: "none", opacity: 0.6 } : undefined}
      >
        <Icon name="play" className="icon" />
      </a>
      {paramNoticeOpen ? (
        <ModalPanel
          title="Run Job"
          onSave={() => {
            setParamNoticeOpen(false);
            void runJob();
          }}
          onCancel={() => setParamNoticeOpen(false)}
          saveLabel="Run Anyway"
        >
          <p className="mb-0">
            This job defines parameter specs. Parameter input is not yet available here; the job will
            run with default parameter values.
          </p>
        </ModalPanel>
      ) : null}
      {error ? (
        <ModalPanel
          title="Run Job"
          onSave={() => setError(null)}
          onCancel={() => setError(null)}
          saveLabel="OK"
        >
          <p className="text-danger mb-0">{error}</p>
        </ModalPanel>
      ) : null}
    </>
  );
}
