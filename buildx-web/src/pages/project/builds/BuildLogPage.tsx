import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

const MOCK_LOG_LINES: string[] = [];

export function BuildLogPage() {
  const { projectPath } = useProject();
  const { number } = useParams<{ number: string }>();
  const [logLines] = useState<string[]>(MOCK_LOG_LINES);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Auto-scroll to bottom on mount
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

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
                className="nav-link"
              >
                Pipeline
              </Link>
            </li>
            <li className="nav-item">
              <Link
                to={`/${projectPath}/~builds/${number}/log`}
                className="nav-link active"
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

          {/* Terminal-style Log Viewer */}
          <div
            className="build-log"
            style={{
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
              fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
              fontSize: "13px",
              lineHeight: "1.5",
              padding: "16px",
              borderRadius: "4px",
              overflowX: "auto",
              maxHeight: "600px",
              overflowY: "auto",
            }}
          >
            {logLines.map((line, index) => (
              <div key={index} style={{ whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {line}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>

          <div className="mt-3 d-flex align-items-center text-muted font-size-sm">
            <Icon name="information" />
            <span className="ml-1">{logLines.length} log entries</span>
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
