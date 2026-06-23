import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

interface MockPipelineStep {
  name: string;
  status: "SUCCESSFUL" | "FAILED" | "RUNNING" | "PENDING" | "SKIPPED";
  duration: string;
  logSummary: string;
}

const MOCK_PIPELINE_STEPS: MockPipelineStep[] = [];

const STATUS_ICON: Record<string, string> = {
  SUCCESSFUL: "check-circle",
  FAILED: "close-circle",
  RUNNING: "loading",
  PENDING: "clock-outline",
  SKIPPED: "minus-circle",
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  SUCCESSFUL: "badge-light-success",
  FAILED: "badge-light-danger",
  RUNNING: "badge-light-info",
  PENDING: "badge-light-warning",
  SKIPPED: "badge-light-secondary",
};

export function BuildPipelinePage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();

  return (
    <ProjectLayout projectPath={projectPath} pageTitle={`Build #${number}`}>
      <div className="card m-3">
        <div className="card-body">
          {/* Tab Navigation */}
          <ul className="nav nav-tabs mb-4">
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}`}
                className="nav-link"
              >
                Dashboard
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/pipeline`}
                className="nav-link active"
              >
                Pipeline
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/log`}
                className="nav-link"
              >
                Log
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/changes`}
                className="nav-link"
              >
                Changes
              </Link>
            </li>
            <li className="nav-item">
              <span className="nav-link disabled">Fixed Issues</span>
            </li>
            <li className="nav-item">
              <span className="nav-link disabled">Artifacts</span>
            </li>
          </ul>

          {/* Pipeline Visualization */}
          <div className="pipeline-steps">
            {MOCK_PIPELINE_STEPS.map((step, index) => (
              <div key={step.name} className="card card-sm mb-3">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="mr-3 d-flex align-items-center justify-content-center">
                      <span className={`badge badge-lg p-3 ${STATUS_BADGE_CLASS[step.status]}`}>
                        <Icon name={STATUS_ICON[step.status]} width={24} height={24} />
                      </span>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center">
                        <strong className="mr-2">
                          Step {index + 1}: {step.name}
                        </strong>
                        <span className={`badge badge-sm font-size-xs ${STATUS_BADGE_CLASS[step.status]}`}>
                          {step.status}
                        </span>
                      </div>
                      <div className="text-muted font-size-sm mt-1">{step.logSummary}</div>
                    </div>
                    <div className="text-muted font-size-sm text-nowrap ml-3">
                      <Icon name="clock" />
                      <span className="ml-1">{step.duration}</span>
                    </div>
                  </div>
                </div>
                {/* Connector line to next step */}
                {index < MOCK_PIPELINE_STEPS.length - 1 && (
                  <div
                    className="pipeline-connector"
                    style={{
                      height: "24px",
                      width: "2px",
                      backgroundColor: "#d4d4d4",
                      marginLeft: "36px",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
