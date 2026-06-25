import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useProject } from "../../../context/ProjectContext";
import { ProjectLayout } from "../../../layout/ProjectLayout";
import { fetchProjects } from "../../../api/projects";
import { CodeContribsPanel } from "./CodeContribsPage";
import { SourceLinesPanel } from "./SourceLinesPage";

type Tab = "contribs" | "lines";

/**
 * CodeStatsPage — tabbed container for code statistics (Contributions / Source Lines).
 * Matches OneDev's CodeStatsPage.java with Tabbable tabs.
 */
export default function CodeStatsPage() {
  const { projectPath } = useProject();
  const location = useLocation();
  const navigate = useNavigate();

  const [projectId, setProjectId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const projects = await fetchProjects();
        if (cancelled) return;
        const project = projects.find((p) => p.path === projectPath);
        if (project) setProjectId(project.id);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectPath]);

  const activeTab: Tab = location.pathname.includes("/lines") ? "lines" : "contribs";

  const switchTab = (t: Tab) => {
    const base = `/${projectPath}/~stats/code`;
    navigate(t === "lines" ? `${base}/lines` : `${base}/contribs`);
  };

  return (
    <ProjectLayout projectPath={projectPath} pageTitle="Code Statistics">
      <div className="code-stats p-2 p-sm-5 d-flex flex-column flex-grow-1">
        <div className="card d-flex flex-column flex-grow-1">
          <div className="card-body d-flex flex-column flex-grow-1">
            <ul className="tabs nav nav-tabs nav-tabs-line mb-5">
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "contribs" ? "active" : ""}`}
                  onClick={() => switchTab("contribs")}
                  style={{ cursor: "pointer" }}
                >
                  Contributions
                </a>
              </li>
              <li className="nav-item">
                <a
                  className={`nav-link ${activeTab === "lines" ? "active" : ""}`}
                  onClick={() => switchTab("lines")}
                  style={{ cursor: "pointer" }}
                >
                  Source Lines
                </a>
              </li>
            </ul>
            {loading ? (
              <div className="text-center py-10 text-muted">Loading...</div>
            ) : projectId ? (
              <div className="flex-grow-1 d-flex flex-column">
                {activeTab === "contribs" ? (
                  <CodeContribsPanel projectId={projectId} />
                ) : (
                  <SourceLinesPanel projectId={projectId} />
                )}
              </div>
            ) : (
              <div className="text-center py-10 text-muted">Project not found</div>
            )}
          </div>
        </div>
      </div>
    </ProjectLayout>
  );
}
