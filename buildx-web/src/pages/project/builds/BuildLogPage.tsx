import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Icon } from "../../../components/onedev/Icon";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { useProject } from "../../../context/ProjectContext";

const MOCK_LOG_LINES = [
  "[2026-06-23 09:15:01] Starting CI Pipeline #101",
  "[2026-06-23 09:15:02] Cloning repository...",
  "[2026-06-23 09:15:03] Repository cloned successfully",
  "[2026-06-23 09:15:03] Step 1/3: Checkout",
  "[2026-06-23 09:15:04] Checking out branch: main",
  "[2026-06-23 09:15:05] HEAD is now at a1b2c3d Add CI pipeline configuration",
  "[2026-06-23 09:15:05] Step 2/3: Build",
  "[2026-06-23 09:15:06] Running: make build",
  "[2026-06-23 09:15:08] go build -o bin/buildx-server ./cmd/buildx-server",
  "[2026-06-23 09:15:12] go build -o bin/buildx-cli ./cmd/buildx-cli",
  "[2026-06-23 09:15:15] Build completed successfully",
  "[2026-06-23 09:15:15] Step 3/3: Test",
  "[2026-06-23 09:15:16] Running: make test",
  "[2026-06-23 09:15:18] go test ./...",
  "[2026-06-23 09:15:20] ok  buildx-server/model",
  "[2026-06-23 09:15:22] ok  buildx-server/security",
  "[2026-06-23 09:15:24] ok  buildx-server/persistence",
  "[2026-06-23 09:15:26] All tests passed",
  "[2026-06-23 09:15:27] Pipeline completed successfully",
  "[2026-06-23 09:15:27] Build #101 finished with status: SUCCESSFUL",
];

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
